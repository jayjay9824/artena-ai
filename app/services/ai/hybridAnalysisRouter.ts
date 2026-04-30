/**
 * V1 Hybrid Router — Gemini-primary, Claude-fallback.
 *
 * Architectural flip from the original Phase 7 design:
 *
 *   • Gemini fires first as the main interpretation engine.
 *   • Claude fires ONLY when Gemini returned null (disabled, API
 *     error, timeout, parse failure, etc.).
 *   • At most one engine call hits the network per request,
 *     unless Gemini fails and Claude takes over.
 *   • Cache (Phase 6) still wraps the whole thing — same image +
 *     question + language returns instantly for 24 h.
 *
 * Forward-compat with V1 launch defaults:
 *   When neither GEMINI_API_KEY nor ENABLE_GEMINI_VERIFICATION is
 *   set, Gemini's service short-circuits to null on entry, so the
 *   router immediately falls through to Claude — i.e. existing
 *   Claude-only behaviour is preserved with no extra latency.
 *
 * Phase rules that still apply:
 *   - Cache first (Phase 7 rule 1).
 *   - Gemini's strict evidence rule still gates finalCandidate
 *     (Phase 5 rule 8 + Phase 7 rule 6) — only ≥ 75 with concrete
 *     `evidence` produces a verified candidate.
 *   - finalConfidence < 75 → shouldAskForLabel + no market
 *     (Phase 7 rule 7).
 *   - Market data only when finalConfidence ≥ 75 AND
 *     objectCategory === "artwork" (Phase 7 rule 8).
 *   - Result is cached on success (Phase 7 rule 9).
 *
 * Failure shape: a Claude-fallback failure does NOT throw. The
 * router returns a safe low-confidence shell so the API endpoint
 * never crashes a user request.
 *
 * Server-only.
 */

import { AI_CONFIG } from "./config";
import { hashImage }                          from "./validation";
import { interpretArtworkWithClaude,
         type ClaudeInterpretationResult }    from "./claudeInterpretationService";
import { verifyArtworkWithGemini,
         type GeminiVerificationResult }      from "./geminiArtworkVerifier";
import { getCachedAnalysis,
         setCachedAnalysis,
         buildCacheKey }                      from "./cache";
import { logAIUsage }                         from "./usageLog";

/* ── Types ──────────────────────────────────────────────────── */

export type HybridEngineUsed = "gemini" | "claude" | "cached";

export type HybridObjectCategory =
  | "artwork"
  | "artifact"
  | "cultural_heritage"
  | "architecture"
  | "historic_site"
  | "ordinary_object"
  | "unknown";

export interface HybridFinalCandidate {
  artistHints:    string[];
  objectCategory: HybridObjectCategory;
  confidence:     number;
  evidence:       string[];
}

export interface HybridArtworkAnalysisResult {
  engineUsed:               HybridEngineUsed;

  /* True when Gemini attempted but failed and Claude took over.
   *  Distinct from engineUsed === "claude" + Gemini disabled. */
  fallbackTriggered:        boolean;

  /* Aggregated content. */
  visualDescription:        string;
  styleAnalysis:            string;
  possibleArtistHints:      string[];
  objectCategory:           HybridObjectCategory;

  /* Confidence — finalConfidence is the single number downstream
     gates read from. */
  recognitionConfidence:    number;
  interpretationConfidence: number;
  finalConfidence:          number;

  /* Populated only when Gemini ran successfully AND its
   *  recognitionConfidence is at least 75 with concrete evidence
   *  (Phase 5 rule 8 caps Gemini at 74 when evidence is empty). */
  finalCandidate?:          HybridFinalCandidate;

  /* UI gates — Phase 7 rules 7 + 8. */
  shouldAskForLabel:        boolean;
  shouldShowMarketData:     boolean;

  /* Gemini extras (empty when Claude served the request). */
  evidence:                 string[];
  groundingUrls:            string[];

  /* Meta. */
  cached:                   boolean;
}

interface RunParams {
  imageBase64:           string;
  imageMimeType:         "image/jpeg" | "image/png" | "image/webp";
  labelText?:            string;
  qrPayload?:            string;
  userQuestion?:         string;
  outputLanguage:        "ko" | "en";
  hasVerifiedArtworkId?: boolean;
  userId:                string;
}

/* ── Public API ─────────────────────────────────────────────── */

export async function runHybridArtworkAnalysis(
  params: RunParams,
): Promise<HybridArtworkAnalysisResult> {
  const startedAt = Date.now();

  // 1 — Cache.
  const imageHash = hashImage(params.imageBase64);
  const cacheKey  = buildCacheKey(imageHash, params.outputLanguage, params.userQuestion);

  const cached = await getCachedAnalysis<HybridArtworkAnalysisResult>(cacheKey);
  if (cached) {
    logUsageSafely({
      userId:           params.userId,
      engine:           cached.engineUsed,
      model:            "cached",
      inputTokens:      0,
      outputTokens:     0,
      estimatedCostUSD: 0,
      cached:           true,
      timestamp:        startedAt,
    });
    return { ...cached, cached: true, engineUsed: "cached" };
  }

  // 2 — Gemini PRIMARY. Returns null when disabled / no key /
  //     timeout / parse failure — all without throwing.
  const geminiResult = await verifyArtworkWithGemini({
    imageBase64:    params.imageBase64,
    imageMimeType:  params.imageMimeType,
    labelText:      params.labelText,
    qrPayload:      params.qrPayload,
    userQuestion:   params.userQuestion,
    outputLanguage: params.outputLanguage,
    userId:         params.userId,
  });

  if (geminiResult) {
    logUsageSafely({
      userId:           params.userId,
      engine:           "gemini",
      model:            AI_CONFIG.gemini.model,
      inputTokens:      0,
      outputTokens:     0,
      estimatedCostUSD: estimateCost(AI_CONFIG.gemini.model),
      cached:           false,
      timestamp:        startedAt,
    });
    const result = buildFromGemini(geminiResult, params, /* fallbackTriggered */ false);
    void cacheResult(cacheKey, result);
    return result;
  }

  // 3 — Claude FALLBACK. Either Gemini was disabled (no env,
  //     forward-compat path → no extra latency) or Gemini errored
  //     (timeout / network / parse — already logged inside
  //     verifyArtworkWithGemini). Either way, Claude takes over.
  const geminiAttempted = AI_CONFIG.gemini.enabled && Boolean(AI_CONFIG.gemini.apiKey);
  const claudeResult = await interpretArtworkWithClaude({
    imageBase64:    params.imageBase64,
    imageMimeType:  params.imageMimeType,
    userQuestion:   params.userQuestion,
    outputLanguage: params.outputLanguage,
    userId:         params.userId,
  });

  if (!claudeResult) {
    return claudeFailureResult(params, /* fallbackTriggered */ geminiAttempted);
  }

  logUsageSafely({
    userId:           params.userId,
    engine:           geminiAttempted ? "claude-fallback" : "claude",
    model:            AI_CONFIG.claude.model,
    inputTokens:      0,
    outputTokens:     0,
    estimatedCostUSD: estimateCost(AI_CONFIG.claude.model),
    cached:           false,
    timestamp:        startedAt,
  });

  const result = buildFromClaude(claudeResult, params, /* fallbackTriggered */ geminiAttempted);
  void cacheResult(cacheKey, result);
  return result;
}

/* ── Result builders ────────────────────────────────────────── */

function buildFromGemini(
  g:                  GeminiVerificationResult,
  params:             RunParams,
  fallbackTriggered:  boolean,
): HybridArtworkAnalysisResult {
  // finalCandidate gate: Gemini ≥ 75 AND has concrete evidence.
  // The "evidence required for ≥ 75" rule is already enforced
  // inside Phase 5's normalize(); double-check defensively here.
  const hasEvidence    = g.evidence.length > 0;
  const isHighConfid   = g.recognitionConfidence >= 75;
  const finalCandidate: HybridFinalCandidate | undefined =
    hasEvidence && isHighConfid
      ? {
          artistHints:    g.possibleArtistHints,
          objectCategory: g.objectCategory,
          confidence:     g.recognitionConfidence,
          evidence:       g.evidence,
        }
      : undefined;

  const finalConfidence = g.recognitionConfidence;

  return {
    engineUsed:               "gemini",
    fallbackTriggered,
    visualDescription:        g.visualDescription,
    styleAnalysis:            g.styleAnalysis,
    possibleArtistHints:      g.possibleArtistHints,
    objectCategory:           g.objectCategory,
    recognitionConfidence:    g.recognitionConfidence,
    interpretationConfidence: g.interpretationConfidence,
    finalConfidence,
    finalCandidate,
    shouldAskForLabel:        finalConfidence < 75 && !params.labelText?.trim(),
    shouldShowMarketData:     finalConfidence >= 75 && g.objectCategory === "artwork",
    evidence:                 g.evidence,
    groundingUrls:            g.groundingUrls,
    cached:                   false,
  };
}

function buildFromClaude(
  c:                  ClaudeInterpretationResult,
  params:             RunParams,
  fallbackTriggered:  boolean,
): HybridArtworkAnalysisResult {
  const finalConfidence = c.recognitionConfidence;

  return {
    engineUsed:               "claude",
    fallbackTriggered,
    visualDescription:        c.visualDescription,
    styleAnalysis:            c.styleAnalysis,
    possibleArtistHints:      c.possibleArtistHints,
    objectCategory:           c.objectCategory,
    recognitionConfidence:    c.recognitionConfidence,
    interpretationConfidence: c.interpretationConfidence,
    finalConfidence,
    // Claude doesn't surface an `evidence` array — no
    // evidence-backed candidate produced from this path.
    finalCandidate:           undefined,
    shouldAskForLabel:        finalConfidence < 75 && !params.labelText?.trim(),
    shouldShowMarketData:     finalConfidence >= 75 && c.objectCategory === "artwork",
    evidence:                 [],
    groundingUrls:            [],
    cached:                   false,
  };
}

function claudeFailureResult(
  params:             RunParams,
  fallbackTriggered:  boolean,
): HybridArtworkAnalysisResult {
  return {
    engineUsed:               "claude",
    fallbackTriggered,
    visualDescription:        "",
    styleAnalysis:            "",
    possibleArtistHints:      [],
    objectCategory:           "unknown",
    recognitionConfidence:    0,
    interpretationConfidence: 0,
    finalConfidence:          0,
    shouldAskForLabel:        !params.labelText?.trim(),
    shouldShowMarketData:     false,
    evidence:                 [],
    groundingUrls:            [],
    cached:                   false,
  };
}

/* ── Helpers ────────────────────────────────────────────────── */

async function cacheResult(
  cacheKey: string,
  result:   HybridArtworkAnalysisResult,
): Promise<void> {
  // Strip the cached flag from the stored copy so a fresh result
  // can correctly mark itself as cached on a future hit.
  const { cached: _cached, ...storable } = result;
  void _cached;
  await setCachedAnalysis(cacheKey, storable);
}

/**
 * V1 ballpark cost per analyze call. Gemini is the main engine
 * now so most calls cost less; Claude only fires on Gemini
 * fallback or when Gemini is disabled.
 */
function estimateCost(model: string): number {
  const m = model.toLowerCase();
  if (m.includes("opus"))   return 0.025;
  if (m.includes("sonnet")) return 0.012;
  if (m.includes("haiku"))  return 0.003;
  if (m.includes("gemini")) return 0.005;
  return 0.015;
}

function logUsageSafely(entry: Parameters<typeof logAIUsage>[0]): void {
  // logAIUsage already swallows errors. Fire-and-forget so the
  // analyze response isn't held up waiting on Redis.
  logAIUsage(entry).catch(() => { /* sanitized inside logAIUsage */ });
}
