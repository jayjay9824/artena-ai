/**
 * POST /api/axvela/analyze — V1 hybrid analyze entrypoint.
 *
 * Wires Phases 1-7 into a single safe HTTP surface:
 *
 *   1. validateOrigin            (Phase 3)  → 403 forbidden
 *   2. getRequestIdentifier      (Phase 3)  → IP / "unknown"
 *   3. checkRateLimit            (Phase 3)  → 429 + Retry-After
 *   4. parse JSON                            → 400 invalid_json
 *   5. validateImageInput        (Phase 2)  → 400 invalid_image
 *   6. userQuestion length ≤ 500             → 400 question_too_long
 *   7. runHybridArtworkAnalysis  (Phase 7)
 *   8. reshape + return
 *
 * V1 priorities (per global rules):
 *   - "Don't break the analyze flow"
 *   - "Cost control"
 *   - "Basic safety only — no admin dashboard"
 *
 * Security stance:
 *   - Stack traces never returned to clients
 *   - imageBase64 never logged
 *   - Error responses are short opaque codes; no implementation
 *     detail leaks (except validation reasons, which are user-
 *     facing hints — "image too large", etc.)
 *
 * Server-only. Sharp / crypto / config import → Node runtime.
 */

import { NextRequest } from "next/server";

import { AI_CONFIG }                   from "../../../services/ai/config";
import { validateOrigin,
         getRequestIdentifier }        from "../../../services/ai/auth";
import { checkRateLimit }              from "../../../services/ai/rateLimit";
import { validateImageInput }          from "../../../services/ai/validation";
import { sanitizeForLog }              from "../../../services/ai/aiUtils";
import { runHybridArtworkAnalysis,
         type HybridArtworkAnalysisResult,
         type HybridFinalCandidate }   from "../../../services/ai/hybridAnalysisRouter";

export const runtime = "nodejs";

const MAX_QUESTION_LENGTH = 500;

/* ── Request body shape (loose — narrowed downstream) ────── */

interface RawBody {
  imageBase64?:           unknown;
  imageMimeType?:         unknown;
  labelText?:             unknown;
  qrPayload?:             unknown;
  userQuestion?:          unknown;
  outputLanguage?:        unknown;
  hasVerifiedArtworkId?:  unknown;
}

/* ── V1 response shape ─────────────────────────────────────── */

interface AnalyzeResponseV1 {
  interpretation: {
    engine:                   "gemini" | "claude";
    visualDescription:        string;
    styleAnalysis:            string;
    possibleArtistHints:      string[];
    objectCategory:           string;
    recognitionConfidence:    number;
    interpretationConfidence: number;
  };
  /** Populated only when Gemini ran successfully and supplied
   *  concrete evidence cues. Absent when Claude served the
   *  request (fallback or Gemini-disabled). */
  verification?: {
    engine:        "gemini";
    evidence:      string[];
    groundingUrls: string[];
  };
  finalCandidate?:        HybridFinalCandidate;
  finalConfidence:        number;
  verificationStatus:     "verified" | "single-engine" | "uncertain";
  shouldAskForLabel:      boolean;
  shouldShowMarketData:   boolean;
  notes:                  string[];
  meta: {
    engineUsed:        string;
    /** True when Gemini was attempted but failed and Claude took
     *  over. Distinct from engineUsed === "claude" with Gemini
     *  disabled (which is the V1-default no-key path). */
    fallbackTriggered: boolean;
    cached:            boolean;
    durationMs:        number;
    outputLanguage:    "ko" | "en";
  };
}

/* ── Handler ───────────────────────────────────────────────── */

export async function POST(request: NextRequest) {
  const startedAt = Date.now();

  // 1 — Origin validation (production gate).
  if (!validateOrigin(request)) {
    return jsonError("forbidden", 403);
  }

  // 2 — Per-request identifier for rate-limit + safe log.
  const identifier = getRequestIdentifier(request);

  // 3 — Rate limit.
  const rl = await checkRateLimit(identifier);
  if (!rl.allowed) {
    return jsonError("rate_limit_exceeded", 429, {
      "Retry-After": String(rl.retryAfter ?? 60),
    });
  }

  // 4 — Parse JSON safely.
  let body: RawBody;
  try {
    body = (await request.json()) as RawBody;
  } catch {
    return jsonError("invalid_json", 400);
  }
  if (!body || typeof body !== "object") {
    return jsonError("invalid_body", 400);
  }

  // 5 — Validate image (size, magic-bytes, declared-vs-actual MIME).
  const declaredMime = typeof body.imageMimeType === "string"
    ? body.imageMimeType
    : "";
  const validation = validateImageInput(
    body.imageBase64,
    declaredMime,
    AI_CONFIG.limits.maxImageSizeMB,
  );
  if (!validation.valid) {
    // Validation reasons are user-facing hints ("image too large"),
    // so we surface them. Implementation detail isn't leaked.
    return jsonError("invalid_image", 400, undefined, { reason: validation.reason });
  }

  // 6 — userQuestion length cap.
  const userQuestion = typeof body.userQuestion === "string"
    ? body.userQuestion
    : undefined;
  if (userQuestion && userQuestion.length > MAX_QUESTION_LENGTH) {
    return jsonError("question_too_long", 400, undefined, {
      maxLength: MAX_QUESTION_LENGTH,
    });
  }

  // Narrow optional fields.
  const labelText = typeof body.labelText === "string" ? body.labelText : undefined;
  const qrPayload = typeof body.qrPayload === "string" ? body.qrPayload : undefined;
  const outputLanguage: "ko" | "en" = body.outputLanguage === "en" ? "en" : "ko";
  const hasVerifiedArtworkId = body.hasVerifiedArtworkId === true;

  // 7 — Hybrid analyze. The router is contractually no-throw; the
  // try/catch here is belt-and-suspenders so even an unforeseen
  // bug surfaces as a clean 500 instead of the stack trace
  // leaking to the client.
  let result: HybridArtworkAnalysisResult;
  try {
    result = await runHybridArtworkAnalysis({
      imageBase64:          body.imageBase64 as string,
      imageMimeType:        validation.mimeType,
      labelText,
      qrPayload,
      userQuestion,
      outputLanguage,
      hasVerifiedArtworkId,
      userId:               identifier,
    });
  } catch (err) {
    safeErrorLog("router-throw", identifier, err);
    return jsonError("internal_error", 500);
  }

  // 8 — Reshape + respond.
  const response = buildResponse(result, outputLanguage, Date.now() - startedAt);
  return jsonOk(response);
}

/* ── Response builder ───────────────────────────────────────── */

function buildResponse(
  result:         HybridArtworkAnalysisResult,
  outputLanguage: "ko" | "en",
  durationMs:     number,
): AnalyzeResponseV1 {
  // verificationStatus reflects whether Gemini supplied an
  // evidence-backed verified candidate. With the new Gemini-primary
  // architecture, "verified" requires Gemini to have run AND
  // produced concrete evidence at ≥75 — this is exactly what
  // finalCandidate already captures.
  const verificationStatus: AnalyzeResponseV1["verificationStatus"] =
    result.finalCandidate           ? "verified"
    : result.finalConfidence >= 75  ? "single-engine"
    :                                 "uncertain";

  const notes: string[] = [];
  if (result.shouldAskForLabel) {
    notes.push(outputLanguage === "ko"
      ? "라벨이나 캡션을 함께 촬영하면 더 정확한 결과를 받을 수 있습니다."
      : "Capturing the label or caption alongside improves accuracy.");
  }
  if (!result.shouldShowMarketData && result.objectCategory !== "artwork") {
    notes.push(outputLanguage === "ko"
      ? "이 대상은 시장 가격보다 문화적·역사적 맥락으로 이해하는 것이 적합합니다."
      : "This object is better understood through cultural or historical context rather than market price.");
  }

  // The interpretation block reflects whichever engine actually
  // produced the analysis. Cached results inherit whatever engine
  // generated the original (engineUsed swaps to "cached" but the
  // upstream content came from gemini or claude).
  const interpretEngine: "gemini" | "claude" =
    result.engineUsed === "gemini" ? "gemini" : "claude";

  return {
    interpretation: {
      engine:                   interpretEngine,
      visualDescription:        result.visualDescription,
      styleAnalysis:            result.styleAnalysis,
      possibleArtistHints:      result.possibleArtistHints,
      objectCategory:           result.objectCategory,
      recognitionConfidence:    result.recognitionConfidence,
      interpretationConfidence: result.interpretationConfidence,
    },
    verification: result.evidence.length > 0
      ? {
          engine:        "gemini",
          evidence:      result.evidence,
          groundingUrls: result.groundingUrls,
        }
      : undefined,
    finalCandidate:       result.finalCandidate,
    finalConfidence:      result.finalConfidence,
    verificationStatus,
    shouldAskForLabel:    result.shouldAskForLabel,
    shouldShowMarketData: result.shouldShowMarketData,
    notes,
    meta: {
      engineUsed:        result.engineUsed,
      fallbackTriggered: result.fallbackTriggered,
      cached:            result.cached,
      durationMs,
      outputLanguage,
    },
  };
}

/* ── Response helpers ──────────────────────────────────────── */

function jsonOk(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status:  200,
    headers: {
      "Content-Type":  "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function jsonError(
  code:         string,
  status:       number,
  extraHeaders?: Record<string, string>,
  extraBody?:   Record<string, unknown>,
): Response {
  return new Response(
    JSON.stringify({ error: code, ...(extraBody ?? {}) }),
    {
      status,
      headers: {
        "Content-Type":  "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        ...(extraHeaders ?? {}),
      },
    },
  );
}

/* ── Safe error logging ────────────────────────────────────── */

function safeErrorLog(reason: string, identifier: string, err: unknown): void {
  // sanitizeForLog masks any nested credentials / base64 / tokens
  // even though the entry shape we pass in shouldn't contain
  // them — defense in depth.
  // CRITICAL: never include err.stack — leaks paths + middleware
  // internals to anyone with access to the log stream.
  // eslint-disable-next-line no-console
  console.error("[axvela.analyze]", sanitizeForLog({
    reason,
    identifier,
    err: err instanceof Error ? err.message : String(err),
  }));
}
