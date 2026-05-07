/**
 * Claude V1 — stable default interpretation engine.
 *
 * Reads everything from AI_CONFIG.claude (model / timeout /
 * maxRetries) and writes back a strictly-typed JSON shape. Never
 * surfaces the raw Anthropic response, never logs the image, and
 * returns null on any parse / API failure rather than throwing —
 * caller decides whether to retry, fall back to Gemini, or
 * surface a user-facing error.
 *
 * Server-only.
 */

import Anthropic from "@anthropic-ai/sdk";
import { AI_CONFIG } from "./config";
import { safeJsonParse, withRetry, withTimeout, sanitizeForLog } from "./aiUtils";

/* ── Types ──────────────────────────────────────────────────── */

export type ClaudeObjectCategory =
  | "artwork"
  | "artifact"
  | "cultural_heritage"
  | "architecture"
  | "historic_site"
  | "ordinary_object"
  | "unknown";

export interface ClaudeInterpretationResult {
  engine:                   "claude";
  visualDescription:        string;
  styleAnalysis:            string;
  possibleArtistHints:      string[];
  objectCategory:           ClaudeObjectCategory;
  /** 0-100 — clamped post-parse. */
  recognitionConfidence:    number;
  /** 0-100 — clamped post-parse. */
  interpretationConfidence: number;
}

interface InterpretParams {
  imageBase64:    string;
  imageMimeType:  "image/jpeg" | "image/png" | "image/webp";
  userQuestion?:  string;
  outputLanguage: "ko" | "en";
  /** Used only in safe error logs — never tied to a stored bucket. */
  userId:         string;
}

/* ── Client (lazy) ──────────────────────────────────────────── */

// Lazy-init so `next build` can import this module without
// requiring the API key to exist. The getter on AI_CONFIG.claude.apiKey
// throws when the env is missing, but only on first request.
let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: AI_CONFIG.claude.apiKey });
  }
  return _client;
}

/* ── Prompt builder ─────────────────────────────────────────── */

function buildSystemPrompt(lang: "ko" | "en"): string {
  return lang === "ko"
    ? `당신은 미술·건축·문화유산을 시각적 단서만으로 분석하는 큐레이터급 어시스턴트입니다.

[엄격한 정확도 규칙]
- 서명·캡션·낙관·명문판 등 명확한 단서가 없으면 작가를 단정하지 마세요.
- 양식·느낌만으로 유명 작가의 작품이라고 단언하지 마세요.
- 가능한 후보는 possibleArtistHints 배열에 "추정" 형태로만 기재합니다.
- 단서가 부족하면 그 사실을 visualDescription에 명시하고 confidence를 낮게 책정하세요.

[자신도 (0-100)]
- recognitionConfidence (식별):
  90+ : 서명·캡션·명문판 등 결정적 단서 일치
  75-89: 양식 + 매체 + 색·구도가 강하게 일치
  60-74: 양식·시대 추정만 가능
  40-59: 양식 추정만, 작가 미상
  < 40 : 식별 거의 불가
- interpretationConfidence (해석): 양식·맥락 분석 자신도

[objectCategory 유효 값]
artwork | artifact | cultural_heritage | architecture | historic_site | ordinary_object | unknown

[출력]
다음 JSON만 반환하세요. 다른 텍스트, 설명, 마크다운 금지:

{
  "engine": "claude",
  "visualDescription": "관찰된 시각 단서를 한국어로 2-3문장",
  "styleAnalysis": "양식·기법·시대 분석을 한국어로 2-3문장",
  "possibleArtistHints": ["추정 작가 후보 (없으면 빈 배열)"],
  "objectCategory": "artwork",
  "recognitionConfidence": 0,
  "interpretationConfidence": 0
}`
    : `You are a curator-grade assistant analyzing art, architecture, and cultural heritage from visual cues only.

[Strict accuracy rules]
- Do not assert an artist's identity without explicit evidence (signature, caption, seal, plaque).
- Do not declare a work to be by a famous artist based on style alone.
- List plausible candidates only in possibleArtistHints, framed as estimates.
- When evidence is thin, say so in visualDescription and set confidence low.

[Confidence (0-100)]
- recognitionConfidence:
  90+ : decisive evidence (signature / caption / plaque match)
  75-89: strong style + medium + composition agreement
  60-74: period / style estimable, artist unknown
  40-59: style estimable only, artist unknown
  < 40 : identification not possible
- interpretationConfidence: confidence in the style / contextual reading

[Valid objectCategory values]
artwork | artifact | cultural_heritage | architecture | historic_site | ordinary_object | unknown

[Output]
Return only the following JSON. No prose, no markdown, no explanation:

{
  "engine": "claude",
  "visualDescription": "Observed visual cues, 2-3 sentences in English",
  "styleAnalysis": "Style / technique / period reading, 2-3 sentences in English",
  "possibleArtistHints": ["candidate artist names (empty array if none)"],
  "objectCategory": "artwork",
  "recognitionConfidence": 0,
  "interpretationConfidence": 0
}`;
}

const DEFAULT_USER_TEXT_KO = "이 이미지를 분석해 주세요.";
const DEFAULT_USER_TEXT_EN = "Please analyze this image.";

/* ── Public API ─────────────────────────────────────────────── */

const VALID_CATEGORIES = new Set<ClaudeObjectCategory>([
  "artwork", "artifact", "cultural_heritage", "architecture",
  "historic_site", "ordinary_object", "unknown",
]);

export async function interpretArtworkWithClaude(
  params: InterpretParams,
): Promise<ClaudeInterpretationResult | null> {
  const userText =
    (params.userQuestion ?? "").trim()
    || (params.outputLanguage === "ko" ? DEFAULT_USER_TEXT_KO : DEFAULT_USER_TEXT_EN);

  try {
    const message = await withRetry(
      () => withTimeout(
        getClient().messages.create({
          model:      AI_CONFIG.claude.model,
          max_tokens: 1500,
          system:     buildSystemPrompt(params.outputLanguage),
          messages: [{
            role: "user",
            content: [
              {
                type:   "image",
                source: {
                  type:       "base64",
                  media_type: params.imageMimeType,
                  data:       params.imageBase64,
                },
              },
              { type: "text", text: userText },
            ],
          }],
        }),
        AI_CONFIG.claude.timeout,
        "claude.interpret",
      ),
      AI_CONFIG.claude.maxRetries,
    );

    const block = message.content.find(b => b.type === "text");
    if (!block || block.type !== "text") {
      logFailure("no-text-block", params, null);
      return null;
    }

    const parsed = safeJsonParse<Partial<ClaudeInterpretationResult>>(block.text);
    if (!parsed) {
      logFailure("json-parse-failed", params, null);
      return null;
    }

    return normalize(parsed);
  } catch (err) {
    logFailure("api-error", params, err);
    return null;
  }
}

/* ── Internals ──────────────────────────────────────────────── */

/** Coerce loose model output into the strict result shape. Any
 *  field that doesn't pass becomes its safe default. */
function normalize(p: Partial<ClaudeInterpretationResult>): ClaudeInterpretationResult {
  const cat = typeof p.objectCategory === "string" && VALID_CATEGORIES.has(p.objectCategory as ClaudeObjectCategory)
    ? (p.objectCategory as ClaudeObjectCategory)
    : "unknown";

  return {
    engine:               "claude",
    visualDescription:    typeof p.visualDescription === "string" ? p.visualDescription : "",
    styleAnalysis:        typeof p.styleAnalysis     === "string" ? p.styleAnalysis     : "",
    possibleArtistHints:  Array.isArray(p.possibleArtistHints)
      ? p.possibleArtistHints.filter((s): s is string => typeof s === "string")
      : [],
    objectCategory:           cat,
    recognitionConfidence:    clamp01(p.recognitionConfidence),
    interpretationConfidence: clamp01(p.interpretationConfidence),
  };
}

function clamp01(v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function logFailure(reason: string, params: InterpretParams, err: unknown) {
  // Critical: never include imageBase64 in a log line.
  // sanitizeForLog masks it both by key name AND by length+pattern.
  // eslint-disable-next-line no-console
  console.warn("[claude.interpret] failure:", sanitizeForLog({
    reason,
    userId:        params.userId,
    mimeType:      params.imageMimeType,
    hasQuestion:   Boolean(params.userQuestion?.trim()),
    outputLanguage: params.outputLanguage,
    err: err instanceof Error ? err.message : err ? String(err) : null,
  }));
}
