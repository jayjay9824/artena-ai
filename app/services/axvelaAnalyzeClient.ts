/**
 * AXVELA AI — Scan-first analyze client (Step 7).
 *
 * Browser-side wrapper around POST /api/axvela/analyze. The route
 * is the existing V1 hybrid analyze entrypoint (Gemini-primary,
 * Claude-fallback). This module:
 *
 *   1. Parses the in-memory DataURL into raw base64 + mime.
 *   2. Posts to the server with a 10s AbortController timeout.
 *   3. Reshapes the server's V1 response into the UI-facing
 *      QuickInsight model used by the AI overlay.
 *   4. Returns a uniform { success, insight, message } envelope so
 *      the caller never has to think about HTTP status, timeouts,
 *      or partial responses.
 *
 * Failure stance:
 *   - Never throws. Network error / timeout / non-2xx / malformed
 *     body all collapse to a graceful, localized "Analysis
 *     unavailable" insight with isMock: true, isVerified: false.
 *   - No raw technical error ever surfaces to the UI.
 *   - API keys live only on the server; this client only knows
 *     about its own /api endpoint.
 */

import type { PhysicalStatus, QuickInsight } from "../components/scan-entry/shared/scanTypes";

const ENDPOINT  = "/api/axvela/analyze";
const TIMEOUT_MS = 10_000;

export interface AnalyzeArtworkParams {
  imageDataUrl:   string;
  outputLanguage: "ko" | "en";
  userQuestion?:  string;
}

export interface AnalyzeArtworkResult {
  success:   boolean;
  insight?:  QuickInsight;
  /** Optional graceful copy to render alongside the insight. Only
   *  populated on the failure path; the UI shows it below the
   *  Quick Insight card so the user knows the data is provisional. */
  message?:  string;
}

export async function analyzeArtworkImage(
  params: AnalyzeArtworkParams,
): Promise<AnalyzeArtworkResult> {
  const { imageDataUrl, outputLanguage, userQuestion } = params;

  const parsed = parseDataUrl(imageDataUrl);
  if (!parsed) return gracefulFailure(outputLanguage);

  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(ENDPOINT, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        imageBase64:    parsed.base64,
        imageMimeType:  parsed.mime,
        outputLanguage,
        userQuestion:   userQuestion?.slice(0, 500),
      }),
      signal:  controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) return gracefulFailure(outputLanguage);

    const data = await res.json().catch(() => null);
    if (!data || typeof data !== "object") {
      return gracefulFailure(outputLanguage);
    }

    return {
      success: true,
      insight: mapResponseToInsight(data, outputLanguage),
    };
  } catch {
    clearTimeout(timer);
    return gracefulFailure(outputLanguage);
  }
}

/* ── Helpers ────────────────────────────────────────────────── */

interface ParsedDataUrl {
  base64: string;
  mime:   "image/jpeg" | "image/png" | "image/webp";
}

/**
 * Splits a `data:image/<type>;base64,<payload>` URL safely.
 * Rejects unsupported MIME types and obvious non-base64 payloads
 * before we waste a network round-trip.
 */
function parseDataUrl(dataUrl: string): ParsedDataUrl | null {
  if (typeof dataUrl !== "string") return null;
  const match = /^data:(image\/[\w+.-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUrl);
  if (!match) return null;

  const declared = match[1].toLowerCase();
  let mime: ParsedDataUrl["mime"];
  switch (declared) {
    case "image/jpeg":
    case "image/jpg":  mime = "image/jpeg"; break;
    case "image/png":  mime = "image/png";  break;
    case "image/webp": mime = "image/webp"; break;
    default: return null;
  }

  const base64 = match[2].replace(/\s/g, "");
  if (base64.length === 0) return null;

  return { base64, mime };
}

/**
 * Locked failure shape per Step 7 spec. Always provisional:
 * isMock: true, isVerified: false, confidence: 0. The title is
 * localized so the card reads cleanly in both languages.
 */
function gracefulFailure(lang: "ko" | "en"): AnalyzeArtworkResult {
  const insight: QuickInsight = {
    title:          lang === "ko" ? "분석을 사용할 수 없습니다" : "Analysis unavailable",
    confidence:     0,
    physicalStatus: "unverified",
    isMock:         true,
    isVerified:     false,
  };
  const message = lang === "ko"
    ? "작품 정보를 가져오는 데 시간이 걸리고 있습니다. 잠시 후 다시 시도해주세요."
    : "It's taking longer than expected to fetch artwork data. Please try again in a moment.";
  return { success: false, insight, message };
}

/**
 * Maps the V1 hybrid analyze response (see app/api/axvela/analyze)
 * into the UI's QuickInsight contract. Conservative on every
 * unknown — the server gives us hints + confidence, never a
 * concrete title or year, so we stay placeholder there.
 *
 * isVerified is gated on the server's verificationStatus === "verified"
 * (Gemini grounding evidence at ≥75). Anything weaker stays
 * unverified so Step 6 won't unlock market/draft prompts.
 */
function mapResponseToInsight(data: unknown, lang: "ko" | "en"): QuickInsight {
  const root = data as Record<string, unknown>;

  const interpretation = (root.interpretation && typeof root.interpretation === "object")
    ? root.interpretation as Record<string, unknown>
    : null;
  const finalCandidate = (root.finalCandidate && typeof root.finalCandidate === "object")
    ? root.finalCandidate as Record<string, unknown>
    : null;

  const candidateHints = Array.isArray(finalCandidate?.artistHints)
    ? (finalCandidate!.artistHints as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const possibleHints  = Array.isArray(interpretation?.possibleArtistHints)
    ? (interpretation!.possibleArtistHints as unknown[]).filter((x): x is string => typeof x === "string")
    : [];

  const artistHint = candidateHints[0] ?? possibleHints[0];

  const finalConfidence = typeof root.finalConfidence === "number" ? root.finalConfidence : 0;
  const verificationStatus = typeof root.verificationStatus === "string" ? root.verificationStatus : "uncertain";
  const isVerified = verificationStatus === "verified";

  const physical: PhysicalStatus = "unverified";

  return {
    artist:         artistHint || (lang === "ko" ? "작가 미상"     : "Unknown artist"),
    title:          lang === "ko" ? "제목 확인 중"     : "Title pending",
    year:           lang === "ko" ? "분석 진행 중"     : "In review",
    medium:         lang === "ko" ? "이미지 기반 분석" : "Image-based analysis",
    confidence:     clampConfidence(finalConfidence),
    physicalStatus: physical,
    isMock:         false,
    isVerified,
  };
}

function clampConfidence(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
