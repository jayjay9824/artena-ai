/**
 * AI_CONFIG — V1 Safe Launch contract.
 *
 * Single source of truth for model selection, timeouts, rate
 * limits, and feature gates. Every analyze / chat path that goes
 * server-side reads from this object instead of reaching into
 * process.env directly.
 *
 * Hard rules (Phase 1):
 *
 *   1. CLAUDE is REQUIRED. Module load throws a clear, actionable
 *      error when no Claude key is found. The legacy
 *      ANTHROPIC_API_KEY env name is accepted as a fallback so
 *      existing deployments don't crash on the first import — see
 *      the "don't break existing flow" global rule.
 *
 *   2. GEMINI is OPTIONAL and gated by BOTH:
 *        ENABLE_GEMINI_VERIFICATION === "true"
 *        AND GEMINI_API_KEY is present
 *      Either missing → gemini.enabled = false. Callers MUST check
 *      this flag before issuing a Gemini call.
 *
 *   3. REDIS (Upstash) is OPTIONAL. Both URL and token are required
 *      to flip redis.enabled true. Cache + rate-limit code paths
 *      should treat redis.enabled === false as a silent passthrough
 *      (no caching, no rate-limiting) — never as an error.
 *
 * Server-only. Importing this from a Client Component will leak
 * the API keys into the browser bundle. Phase 2+ wires it into
 * route handlers; until then nothing imports it.
 */

const readEnv = (key: string): string | undefined => {
  const raw = process.env[key];
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

/* ── REQUIRED ────────────────────────────────────────────────── */

// CLAUDE_API_KEY is the canonical name. ANTHROPIC_API_KEY is the
// SDK-conventional name and is what the current production env
// already has set, so we accept either to avoid breaking the
// existing analyze pipeline at deploy.
//
// Validation is LAZY — defer the throw until the apiKey getter
// is actually read. `next build` imports this module but never
// touches the apiKey, so missing env fails at first AI request
// (clean 500) instead of breaking the build.
const _claudeKey =
  readEnv("CLAUDE_API_KEY") ?? readEnv("ANTHROPIC_API_KEY");

function requireClaudeKey(): string {
  if (!_claudeKey) {
    throw new Error(
      "[AI_CONFIG] Claude API key is missing. " +
      "Set CLAUDE_API_KEY on your hosting environment " +
      "(Vercel → Project → Settings → Environment Variables) " +
      "and redeploy. ANTHROPIC_API_KEY is also accepted for " +
      "backward compatibility.",
    );
  }
  return _claudeKey;
}

/* ── OPTIONAL ───────────────────────────────────────────────── */

const GEMINI_API_KEY             = readEnv("GEMINI_API_KEY");
const ENABLE_GEMINI_VERIFICATION = readEnv("ENABLE_GEMINI_VERIFICATION") === "true";

const REDIS_URL   = readEnv("UPSTASH_REDIS_REST_URL");
const REDIS_TOKEN = readEnv("UPSTASH_REDIS_REST_TOKEN");

const ALLOWED_ORIGINS_RAW = readEnv("ALLOWED_ORIGINS");

/* ── Frozen config tree ─────────────────────────────────────── */

export const AI_CONFIG = Object.freeze({
  claude: Object.freeze({
    /** Lazy — throws on read when neither CLAUDE_API_KEY nor
     *  ANTHROPIC_API_KEY is set. Build-time imports never read
     *  this getter, so a missing env crashes at the first
     *  request (cleanly, via the route's try/catch) instead of
     *  poisoning `next build`. */
    get apiKey(): string { return requireClaudeKey(); },
    model:      readEnv("CLAUDE_MODEL") ?? "claude-sonnet-4-5",
    timeout:    25_000,
    maxRetries: 1,
  }),

  gemini: Object.freeze({
    apiKey:    GEMINI_API_KEY,
    model:     readEnv("GEMINI_MODEL") ?? "gemini-2.5-pro",
    timeout:   16_000,
    /** True only when the operator has explicitly opted in AND a
     *  key is present. The hybrid pipeline reads this and skips
     *  the verification step entirely if false. */
    enabled:   ENABLE_GEMINI_VERIFICATION && Boolean(GEMINI_API_KEY),
  }),

  redis: Object.freeze({
    url:     REDIS_URL,
    token:   REDIS_TOKEN,
    /** Cache + rate-limit modules must check this and degrade to
     *  silent passthrough when false. Never throw because Redis
     *  is missing — V1 launches without it should still work. */
    enabled: Boolean(REDIS_URL && REDIS_TOKEN),
  }),

  limits: Object.freeze({
    maxImageSizeMB:     6,
    rateLimitPerMinute: 5,
    rateLimitPerHour:   30,
    cacheExpirySeconds: 86_400,   // 24 h
  }),

  cors: Object.freeze({
    /** Comma-separated list parsed once at startup. Empty array =
     *  caller decides (default to same-origin). */
    allowedOrigins: ALLOWED_ORIGINS_RAW
      ? ALLOWED_ORIGINS_RAW.split(",").map(o => o.trim()).filter(Boolean)
      : [],
  }),
});

export type AIConfig = typeof AI_CONFIG;
