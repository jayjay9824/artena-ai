/**
 * Gemini V1 — optional second-engine verifier.
 *
 * Strictly conditional. The hybrid router can call this safely
 * without checking gemini.enabled itself — if Gemini is disabled
 * (env opt-out, no key, or any failure path), the function
 * returns null and the router proceeds with Claude only.
 *
 * Design contract (Phase 5):
 *
 *   • If AI_CONFIG.gemini.enabled is false  → return null (rule 1)
 *   • If GEMINI_API_KEY missing             → return null (rule 2)
 *   • Timeout                               → 16 s via AbortSignal (rule 3)
 *   • Any failure (HTTP / parse / network)  → return null (rule 4, 5)
 *   • Never throws                          → caller can assume try-free
 *   • No grounding tool enabled             → groundingUrls is ALWAYS []
 *     (rule 7 — we never fabricate URLs because we don't ask for any)
 *   • Confidence ≥ 75 requires concrete evidence (signature, caption,
 *     plaque, seal). If the model returns 75+ with empty evidence,
 *     normalization clamps it to 74. (rule 8)
 *
 * Server-only. Uses AI_CONFIG (server env) + Buffer/fetch.
 *
 * Implementation note: V1 talks to the Gemini REST endpoint via
 * fetch — no @google/generative-ai SDK install. When the operator
 * doesn't set GEMINI_API_KEY + ENABLE_GEMINI_VERIFICATION, the
 * function short-circuits before any network code path so this
 * module is effectively dead weight on the V1 critical path.
 */

import { AI_CONFIG } from "./config";
import { safeJsonParse, sanitizeForLog } from "./aiUtils";

/* ── Types ──────────────────────────────────────────────────── */

export type GeminiObjectCategory =
  | "artwork"
  | "artifact"
  | "cultural_heritage"
  | "architecture"
  | "historic_site"
  | "ordinary_object"
  | "unknown";

export interface GeminiVerificationResult {
  engine:                   "gemini";
  visualDescription:        string;
  styleAnalysis:            string;
  possibleArtistHints:      string[];
  objectCategory:           GeminiObjectCategory;
  /** 0-100. Clamped to ≤ 74 when `evidence` is empty (rule 8). */
  recognitionConfidence:    number;
  /** 0-100. Same evidence-based cap as recognitionConfidence. */
  interpretationConfidence: number;
  /** Verifiable cues observed in the image (signature, caption,
   *  plaque, seal, museum tag, etc). Drives the confidence cap. */
  evidence:                 string[];
  /** Always [] in V1 — we don't enable Gemini's grounding tool, so
   *  there are no API-supplied URLs to surface. Rule 7 forbids
   *  fabricating any. */
  groundingUrls:            string[];
}

interface VerifyParams {
  imageBase64:    string;
  imageMimeType:  string;
  labelText?:     string;
  qrPayload?:     string;
  userQuestion?:  string;
  outputLanguage: "ko" | "en";
  userId:         string;
}

const VALID_CATEGORIES = new Set<GeminiObjectCategory>([
  "artwork", "artifact", "cultural_heritage", "architecture",
  "historic_site", "ordinary_object", "unknown",
]);

/* ── Public API ─────────────────────────────────────────────── */

export async function verifyArtworkWithGemini(
  params: VerifyParams,
): Promise<GeminiVerificationResult | null> {
  // Rule 1 + 2 — disabled or unconfigured → bail before touching
  // network. No log either; this isn't a failure, it's the
  // configured behavior.
  if (!AI_CONFIG.gemini.enabled) return null;
  const apiKey = AI_CONFIG.gemini.apiKey;
  if (!apiKey) return null;

  try {
    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${encodeURIComponent(AI_CONFIG.gemini.model)}:generateContent` +
      `?key=${encodeURIComponent(apiKey)}`;

    const requestBody = {
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType: params.imageMimeType,
              data:     params.imageBase64,
            },
          },
          { text: buildPrompt(params) },
        ],
      }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature:      0.1,
        maxOutputTokens:  1500,
      },
    };

    // Rule 3 — 16s timeout via AbortSignal. Fetch throws AbortError
    // on timeout, caught below.
    const res = await fetch(endpoint, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(requestBody),
      signal:  AbortSignal.timeout(AI_CONFIG.gemini.timeout),
    });

    if (!res.ok) {
      logFailure(`http-${res.status}`, params, null);
      return null;
    }

    const json = await res.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") {
      logFailure("no-text-part", params, null);
      return null;
    }

    const parsed = safeJsonParse<Partial<GeminiVerificationResult>>(text);
    if (!parsed) {
      logFailure("json-parse-failed", params, null);
      return null;
    }

    return normalize(parsed);
  } catch (err) {
    // Rule 4 + 5 — never throw, never block the app.
    logFailure("api-error", params, err);
    return null;
  }
}

/* ── Prompt ─────────────────────────────────────────────────── */

function buildPrompt(p: VerifyParams): string {
  const supplementary: string[] = [];
  if (p.labelText?.trim())    supplementary.push(p.outputLanguage === "ko"
    ? `라벨/캡션: "${p.labelText.trim()}"`
    : `Label / caption: "${p.labelText.trim()}"`);
  if (p.qrPayload?.trim())    supplementary.push(p.outputLanguage === "ko"
    ? `QR 페이로드: "${p.qrPayload.trim()}"`
    : `QR payload: "${p.qrPayload.trim()}"`);
  if (p.userQuestion?.trim()) supplementary.push(p.outputLanguage === "ko"
    ? `사용자 질문: "${p.userQuestion.trim()}"`
    : `User question: "${p.userQuestion.trim()}"`);

  const supBlock = supplementary.length > 0
    ? (p.outputLanguage === "ko" ? "\n[보조 단서]\n" : "\n[Supplementary cues]\n") +
      supplementary.join("\n")
    : "";

  return p.outputLanguage === "ko"
    ? `당신은 미술·건축·문화유산을 시각적 단서로 분석하는 큐레이터급 AI 엔진입니다.

[엄격한 정확도 규칙]
- 시각적 양식 유사성만으로는 작가/작품을 단정하지 마세요.
- 단정 가능한 단서(서명·캡션·명문판·낙관·도장·박물관 라벨)는 evidence 배열에 기재합니다.
- evidence가 비어 있으면 recognitionConfidence와 interpretationConfidence 둘 다 절대 75 이상이어선 안 됩니다.
- 확실치 않은 작가는 possibleArtistHints에 후보로만 기재합니다.
- 외부 URL이나 출처를 만들어내지 마세요. groundingUrls는 항상 빈 배열입니다.

[objectCategory 유효 값]
artwork | artifact | cultural_heritage | architecture | historic_site | ordinary_object | unknown
${supBlock}

[출력]
다음 JSON만 반환하세요. 다른 텍스트, 설명, 마크다운 금지:

{
  "engine": "gemini",
  "visualDescription": "관찰된 시각 단서를 한국어로 2-3문장",
  "styleAnalysis": "양식·기법·시대 분석을 한국어로 2-3문장",
  "possibleArtistHints": ["추정 작가 후보 (없으면 빈 배열)"],
  "objectCategory": "artwork",
  "recognitionConfidence": 0,
  "interpretationConfidence": 0,
  "evidence": ["관찰 가능한 결정적 단서들 (없으면 빈 배열)"],
  "groundingUrls": []
}`
    : `You are a curator-grade AI engine analyzing art, architecture, and cultural heritage from visual cues only.

[Strict accuracy rules]
- Do not assert an artist's identity from style similarity alone.
- Concrete cues (signature, caption, plaque, seal, museum tag) go in the evidence array.
- If evidence is empty, BOTH recognitionConfidence and interpretationConfidence MUST be < 75.
- Tentative artist names go in possibleArtistHints as candidates only.
- Do not invent URLs or external sources. groundingUrls is always an empty array.

[Valid objectCategory values]
artwork | artifact | cultural_heritage | architecture | historic_site | ordinary_object | unknown
${supBlock}

[Output]
Return only the following JSON. No prose, no markdown:

{
  "engine": "gemini",
  "visualDescription": "Observed visual cues, 2-3 sentences in English",
  "styleAnalysis": "Style / technique / period reading, 2-3 sentences in English",
  "possibleArtistHints": ["candidate artist names (empty array if none)"],
  "objectCategory": "artwork",
  "recognitionConfidence": 0,
  "interpretationConfidence": 0,
  "evidence": ["concrete observable cues (empty array if none)"],
  "groundingUrls": []
}`;
}

/* ── Normalization ──────────────────────────────────────────── */

/**
 * Coerce loose model output into the strict result shape AND
 * enforce the no-style-similarity-≥75 rule. If the model returns
 * a high confidence with empty evidence, we cap it.
 */
function normalize(p: Partial<GeminiVerificationResult>): GeminiVerificationResult {
  const objectCategory: GeminiObjectCategory =
    typeof p.objectCategory === "string"
      && VALID_CATEGORIES.has(p.objectCategory as GeminiObjectCategory)
      ? (p.objectCategory as GeminiObjectCategory)
      : "unknown";

  const evidence = Array.isArray(p.evidence)
    ? p.evidence.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    : [];

  const possibleArtistHints = Array.isArray(p.possibleArtistHints)
    ? p.possibleArtistHints.filter((s): s is string => typeof s === "string")
    : [];

  let recognitionConfidence    = clamp01(p.recognitionConfidence);
  let interpretationConfidence = clamp01(p.interpretationConfidence);

  // Rule 8 — visual style similarity alone never crosses 75.
  // "Concrete evidence" = the model populated `evidence`.
  if (evidence.length === 0) {
    if (recognitionConfidence    > 74) recognitionConfidence    = 74;
    if (interpretationConfidence > 74) interpretationConfidence = 74;
  }

  return {
    engine:                   "gemini",
    visualDescription:        typeof p.visualDescription === "string" ? p.visualDescription : "",
    styleAnalysis:            typeof p.styleAnalysis     === "string" ? p.styleAnalysis     : "",
    possibleArtistHints,
    objectCategory,
    recognitionConfidence,
    interpretationConfidence,
    evidence,
    // Rule 7 — V1 doesn't enable a grounding tool, so we never
    // surface API-derived URLs. We also explicitly drop anything
    // the model tried to put here, since it would be fabricated.
    groundingUrls:            [],
  };
}

function clamp01(v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

/* ── Logging ────────────────────────────────────────────────── */

function logFailure(reason: string, params: VerifyParams, err: unknown) {
  // sanitizeForLog handles the imageBase64 + any sensitive headers
  // both by key name and by length+pattern.
  // eslint-disable-next-line no-console
  console.warn("[gemini.verify] failure:", sanitizeForLog({
    reason,
    userId:         params.userId,
    mimeType:       params.imageMimeType,
    hasLabel:       Boolean(params.labelText?.trim()),
    hasQR:          Boolean(params.qrPayload?.trim()),
    hasQuestion:    Boolean(params.userQuestion?.trim()),
    outputLanguage: params.outputLanguage,
    err: err instanceof Error ? err.message : err ? String(err) : null,
  }));
}
