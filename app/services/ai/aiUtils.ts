/**
 * Shared AI helper utilities — JSON parsing, timeout / retry
 * wrappers, lightweight intent detection, and a redacting log
 * sanitizer.
 *
 * Server-side. Phase 3+ wires these into the analyze / chat /
 * hybrid routes; Phase 2 just creates the surface.
 */

/* ── JSON extraction ────────────────────────────────────────── */

/**
 * Pull the first JSON object out of a model's free-text response.
 * Tolerates leading / trailing whitespace, ```json fences, and
 * stray prose around the block.
 *
 * Returns the original (trimmed) text when no braces are found —
 * letting the caller pass straight to JSON.parse and surface any
 * parse error, instead of silently swapping to garbage.
 */
export function stripJson(text: string): string {
  if (typeof text !== "string") return "";
  let t = text.trim();
  t = t.replace(/^```(?:json|JSON)?\s*/i, "").replace(/\s*```$/, "");
  const start = t.indexOf("{");
  const end   = t.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return t;
  return t.slice(start, end + 1);
}

/** Returns `null` instead of throwing on bad input — callers check
 *  for null and decide whether to fall back, retry, or surface. */
export function safeJsonParse<T = unknown>(text: string): T | null {
  try {
    return JSON.parse(stripJson(text)) as T;
  } catch {
    return null;
  }
}

/* ── Timeout / retry wrappers ──────────────────────────────── */

export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`[timeout] ${label} exceeded ${ms}ms`);
    this.name = "TimeoutError";
  }
}

/**
 * Race a promise against a timer. The wrapped promise still runs
 * to completion in the background — caller is responsible for any
 * cancellation (AbortController) at the source if it matters.
 */
export function withTimeout<T>(
  promise:   Promise<T>,
  timeoutMs: number,
  label:     string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(
      () => reject(new TimeoutError(label, timeoutMs)),
      timeoutMs,
    );
    promise.then(
      (v) => { clearTimeout(id); resolve(v); },
      (e) => { clearTimeout(id); reject(e); },
    );
  });
}

/** Status codes that we never retry — they reflect caller error
 *  (bad request / auth / forbidden), not a transient failure. */
const NON_RETRY_STATUSES = new Set([400, 401, 403]);

function isClientError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { status?: number; response?: { status?: number }; name?: string };
  const status = e.status ?? e.response?.status;
  if (typeof status === "number" && NON_RETRY_STATUSES.has(status)) return true;
  // Anthropic SDK throws subclassed errors with these names.
  const name = e.name;
  if (typeof name === "string"
    && /^(AuthenticationError|PermissionDeniedError|BadRequestError|InvalidRequestError)/.test(name)) {
    return true;
  }
  return false;
}

/**
 * Simple retry with exponential backoff. Retries `retries` extra
 * times after the first attempt (so withRetry(fn, 1) runs at most
 * twice). 4xx client errors short-circuit out — we don't waste
 * budget retrying bad requests or auth failures.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 1,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (isClientError(err)) throw err;       // never retry 400/401/403
      if (attempt === retries)  throw err;       // last attempt — give up
      const delay = 250 * Math.pow(2, attempt) + Math.floor(Math.random() * 100);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

/* ── Intent detection (lightweight, generic) ─────────────────── */

export type Intent = "price" | "compare" | "recommend" | "explain" | "other";

const INTENT_PATTERNS: Array<{ intent: Intent; patterns: RegExp[] }> = [
  { intent: "price",
    patterns: [
      /가격/, /얼마/, /시장가/, /추정가/, /투자/, /가치/,
      /\bprice/i, /\bvalue/i, /\bestimate/i, /\bmarket/i, /\binvestment/i,
    ],
  },
  { intent: "compare",
    patterns: [
      /비슷/, /유사/, /비교/,
      /\bsimilar/i, /\bcompare/i, /\bcomparable/i,
    ],
  },
  { intent: "recommend",
    patterns: [
      /추천/,
      /\brecommend/i, /\bsuggest/i,
    ],
  },
  { intent: "explain",
    patterns: [
      /설명/, /해설/, /의미/, /무엇/, /뭐야/, /왜/, /어떻게/,
      /\bexplain/i, /\bmeaning/i, /\bwhy\b/i, /\bhow\b/i, /\bwhat\b/i,
    ],
  },
];

/**
 * Coarse classification of the user's question into one of five
 * buckets — used by the hybrid router to decide which surface
 * answers (e.g. price gate, comparable lookup).
 *
 * Distinct from app/services/ai/modeDetection.ts which classifies
 * for the AXVELA Mode System (appreciation / investment / expert).
 * Phase 3+ may consolidate; for now they coexist and serve
 * different consumers.
 */
export function detectIntent(question: string): Intent {
  if (typeof question !== "string") return "other";
  const q = question.trim();
  if (q.length === 0) return "other";
  for (const { intent, patterns } of INTENT_PATTERNS) {
    if (patterns.some(p => p.test(q))) return intent;
  }
  return "other";
}

/* ── Safe logging ───────────────────────────────────────────── */

const SENSITIVE_KEY_PATTERN =
  /(image_?base64|imageb64|api_?key|authorization|password|secret|token|cookie|access_?token|refresh_?token)/i;

const BASE64_LIKE = /^[A-Za-z0-9+/=\s]+$/;
const LARGE_STRING_THRESHOLD = 256;
const MAX_DEPTH = 5;

/**
 * Recursively redact sensitive keys + large base64-like strings
 * before logging. Hits in priority order:
 *
 *   1. depth cap — bottoms out at 5 nested levels with "[deep]"
 *   2. key name — anything matching SENSITIVE_KEY_PATTERN becomes
 *      "[REDACTED]" regardless of value type
 *   3. credential pattern — strings that look like Bearer tokens
 *      or "sk-..." API keys are masked even if their key isn't
 *      sensitive-named
 *   4. base64 sniff — strings > 256 chars that look like base64
 *      become "[REDACTED:base64-like N bytes]" (catches raw image
 *      payloads even when the parent object is unfamiliar)
 *
 * Never throws. Idempotent — safe to call on already-sanitized
 * objects.
 */
export function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[deep]";
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    if (value.length > LARGE_STRING_THRESHOLD && BASE64_LIKE.test(value)) {
      return `[REDACTED:base64-like ${value.length} chars]`;
    }
    if (/^Bearer\s+\S+$/i.test(value) || /^sk-[A-Za-z0-9_-]{10,}$/.test(value)) {
      return "[REDACTED:credential]";
    }
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return `${value.toString()}n`;

  if (Array.isArray(value)) {
    return value.map(v => sanitizeForLog(v, depth + 1));
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(k)) {
        out[k] = "[REDACTED]";
      } else {
        out[k] = sanitizeForLog(v, depth + 1);
      }
    }
    return out;
  }

  return value;
}
