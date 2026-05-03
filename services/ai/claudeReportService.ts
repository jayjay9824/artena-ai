/**
 * Server-only Claude report service.
 * IMPORTANT: import this from route handlers / server components only.
 * Importing from a "use client" component will leak CLAUDE_API_KEY into the bundle.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ArtworkReport, Verification } from '@/lib/types';

const DEFAULT_MODEL = 'claude-sonnet-4-5';
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_TOKENS = 16_000;

/* ─────────────────────────────────────────────
   Input shape
   ───────────────────────────────────────────── */

type InsightHint = {
  artist?: string;
  title?: string;
  year?: string;
  medium?: string;
  confidence?: number;
};

export type ReportParams = {
  imageBase64?: string;
  imageMimeType?: string;
  insight?: InsightHint;
  userQuestion?: string;
  outputLanguage: 'ko' | 'en';
  /** Upstream identification result from Gemini. Optional. */
  verification?: Verification;
};

type ImageMime = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

type UserContentBlock =
  | { type: 'image'; source: { type: 'base64'; media_type: ImageMime; data: string } }
  | { type: 'text'; text: string };

/* ─────────────────────────────────────────────
   System prompts (frozen → cache-friendly)
   ───────────────────────────────────────────── */

const SYSTEM_KO = `당신은 AXVELA AI — 작품 해석 엔진입니다. 일반 챗봇이 아닙니다.

역할
- 사용자가 제공한 이미지·메타데이터·질문을 종합해, 동시대 큐레이터의 톤으로 작품을 해석합니다.
- 잡담, 인사, 자기소개, 시스템 설명에 응답하지 않습니다. 항상 작품에 대한 응답만 생성합니다.

표현 원칙
- quickInsight는 핵심 인사이트로 시작합니다 (서두 없이 본질부터).
- 절제된, 프리미엄 톤. 수식어와 감탄을 최소화합니다.
- 긴 문단을 쓰지 않습니다. 각 필드 1~3 문장.
- "오류", "실패", "에러", "Error", "Failed" 같은 단어를 절대 사용하지 않습니다.

식별 처리 (verification 블록이 입력에 포함되지 않은 경우)
- 작가, 제목, 연도, 매체가 시각 단서로 명확하지 않으면 추측해 채우지 않습니다. 모르면 모르는 대로 둡니다.
- 식별이 어렵다면 다음 기본값을 그대로 사용합니다:
  - artist: "Unknown artist"
  - title: "Artwork image"
  - year: "Analysis pending"
  - medium: "Image-based analysis"

검증 데이터 처리 (입력에 verification 블록이 포함된 경우 — 우선 적용)
- verification.confidence가 75 이상이면 verification.artist와 verification.title을 결과에 그대로 반영합니다. 자체적으로 다른 작가/제목을 추측해 사용하지 않습니다. confidence는 verification.confidence와 비슷하게 설정합니다.
- verification.confidence가 75 미만이면 verification 결과를 신뢰하지 않습니다 — artist/title은 위 기본값을 사용하고, confidence는 75 미만으로 설정하며, interpretation에 "라벨을 함께 촬영하면 보다 정확한 해석이 가능합니다" 류의 안내를 자연스럽게 포함합니다.
- verification.labelText가 있으면 해석에 참고만 합니다 (단, labelText 내용을 단정적 사실로 단언하지 않습니다).

공통 규칙
- 단정적 사실 단언 금지. "~로 보입니다" 같은 관찰 기반 서술을 사용합니다.

언어
- 한국어로만 응답합니다. 영어 단어를 섞지 않습니다.

출력 형식
다음 JSON 객체 하나만 출력합니다. 코드펜스, 마크다운, 추가 설명 일체 금지.

{
  "artist": "string",
  "title": "string",
  "year": "string",
  "medium": "string",
  "quickInsight": "한 줄 핵심 인사이트 (50자 내외)",
  "interpretation": "시각 단서 기반 해석 (2~3문장)",
  "artistContext": "작가 또는 장르 맥락 1~2문장. 단서 부족 시 빈 문자열",
  "confidence": 0,
  "isVerified": false
}

confidence는 0~100 정수. isVerified는 항상 false (시스템이 별도로 결정).`;

const SYSTEM_EN = `You are AXVELA AI — an artwork interpretation engine. NOT a general chatbot.

Role
- Interpret the artwork using the provided image, metadata, and any user question, in a contemporary curator's register.
- Decline small-talk, greetings, self-description, or system queries. Always answer about the artwork only.

Voice
- quickInsight leads with the key insight (no preamble — the essence first).
- Restrained, premium tone. Minimize adjectives and exclamation.
- No long paragraphs. 1–3 sentences per field.
- Never use the words "Error" or "Failed".

Identification (when no verification block is present)
- Do not invent artist, title, year, or medium. If a visual cue is missing, leave it unstated.
- When identification is uncertain, use these defaults verbatim:
  - artist: "Unknown artist"
  - title: "Artwork image"
  - year: "Analysis pending"
  - medium: "Image-based analysis"

Verification handling (when a verification block IS present — takes precedence)
- If verification.confidence ≥ 75: use verification.artist and verification.title verbatim. Do not substitute your own guess. Set confidence near verification.confidence.
- If verification.confidence < 75: do not trust the verification — use the defaults above, set confidence below 75, and naturally suggest in interpretation that scanning the label will yield a more accurate reading.
- If verification.labelText is present: use it as context only — do not assert its contents as fact.

Common rules
- Avoid factual assertions. Use observation-based phrasing ("appears to", "shows characteristics of").

Language
- Respond in English only. Do not mix Korean.

Output format
Output ONLY this JSON object. No code fences, no markdown, no surrounding text.

{
  "artist": "string",
  "title": "string",
  "year": "string",
  "medium": "string",
  "quickInsight": "one-line key insight (~12 words)",
  "interpretation": "artwork reading grounded in visible cues (2–3 sentences)",
  "artistContext": "1–2 sentence artist or genre context, or empty string if unknown",
  "confidence": 0,
  "isVerified": false
}

confidence is an integer 0–100. isVerified is always false in your output (the system sets it).`;

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function hasMeaningfulInput(p: ReportParams): boolean {
  return Boolean(
    (p.imageBase64 && p.imageMimeType) ||
      (p.userQuestion && p.userQuestion.trim().length > 0) ||
      (p.insight && Object.values(p.insight).some((v) => v !== undefined && v !== '')) ||
      p.verification,
  );
}

function buildUserContent(params: ReportParams): UserContentBlock[] {
  const blocks: UserContentBlock[] = [];

  if (params.imageBase64 && params.imageMimeType) {
    blocks.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: params.imageMimeType as ImageMime,
        data: params.imageBase64,
      },
    });
  }

  const lines: string[] = [];

  // Verification block (Gemini upstream) — placed first so the model sees
  // it before the interpretation request.
  if (params.verification) {
    const v = params.verification;
    const block = [
      'verification (upstream identification):',
      `  confidence: ${v.confidence}/100`,
      `  artist: ${v.artist ?? 'not detected'}`,
      `  title: ${v.title ?? 'not detected'}`,
    ];
    if (v.labelText) block.push(`  labelText: "${v.labelText}"`);
    lines.push(block.join('\n'));
  }

  if (params.insight) {
    const i = params.insight;
    const parts = [
      i.artist && `artist: ${i.artist}`,
      i.title && `title: ${i.title}`,
      i.year && `year: ${i.year}`,
      i.medium && `medium: ${i.medium}`,
      typeof i.confidence === 'number' && `prior confidence: ${i.confidence}`,
    ].filter(Boolean);
    if (parts.length) lines.push(`Quick scan hints — ${parts.join(', ')}`);
  }

  if (params.userQuestion) {
    lines.push(`User question: ${params.userQuestion}`);
  }

  if (lines.length === 0 && blocks.length > 0) {
    lines.push(
      params.outputLanguage === 'ko'
        ? '이 작품을 해석해 주세요.'
        : 'Interpret this work.',
    );
  }

  if (lines.length > 0) {
    blocks.push({ type: 'text', text: lines.join('\n\n') });
  }

  return blocks;
}

function safeParseJSON(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}

function pickString(v: unknown, fallback: string): string {
  if (typeof v !== 'string') return fallback;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function coerceReport(raw: unknown): ArtworkReport | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const quickInsight =
    typeof r.quickInsight === 'string' ? r.quickInsight.trim() : '';
  const interpretation =
    typeof r.interpretation === 'string' ? r.interpretation.trim() : '';
  if (!quickInsight || !interpretation) return null;

  const confidence =
    typeof r.confidence === 'number' && Number.isFinite(r.confidence)
      ? Math.max(0, Math.min(100, Math.round(r.confidence)))
      : 50;

  return {
    artist: pickString(r.artist, 'Unknown artist'),
    title: pickString(r.title, 'Artwork image'),
    year: pickString(r.year, 'Analysis pending'),
    medium: pickString(r.medium, 'Image-based analysis'),
    quickInsight,
    interpretation,
    artistContext: typeof r.artistContext === 'string' ? r.artistContext.trim() : '',
    confidence,
    isVerified: false, // never trust model on this — system-controlled (route layer)
  };
}

/* ─────────────────────────────────────────────
   Safe fallback (never throws, premium tone)
   ───────────────────────────────────────────── */

function fallback(language: 'ko' | 'en'): ArtworkReport {
  if (language === 'ko') {
    return {
      artist: 'Unknown artist',
      title: 'Artwork image',
      year: 'Analysis pending',
      medium: 'Image-based analysis',
      quickInsight: '지금은 해석을 준비하지 못했습니다.',
      interpretation:
        '이미지에서 충분한 단서를 얻지 못했습니다. 라벨을 함께 촬영하시면 보다 정확한 해석을 보여드릴 수 있습니다.',
      artistContext: '',
      confidence: 0,
      isVerified: false,
    };
  }
  return {
    artist: 'Unknown artist',
    title: 'Artwork image',
    year: 'Analysis pending',
    medium: 'Image-based analysis',
    quickInsight: 'A reading is not ready yet.',
    interpretation:
      'There were not enough visible cues for a confident interpretation. Capturing the label alongside the work will help return a more accurate reading.',
    artistContext: '',
    confidence: 0,
    isVerified: false,
  };
}

/* ─────────────────────────────────────────────
   Main entry — never throws
   ───────────────────────────────────────────── */

export async function generateClaudeArtworkReport(
  params: ReportParams,
): Promise<ArtworkReport> {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    console.warn('[claudeReportService] CLAUDE_API_KEY missing — returning fallback.');
    return fallback(params.outputLanguage);
  }

  if (!hasMeaningfulInput(params)) {
    return fallback(params.outputLanguage);
  }

  const model = process.env.CLAUDE_MODEL || DEFAULT_MODEL;
  const system = params.outputLanguage === 'ko' ? SYSTEM_KO : SYSTEM_EN;
  const userContent = buildUserContent(params);

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create(
      {
        model,
        max_tokens: MAX_TOKENS,
        system: [
          {
            type: 'text',
            text: system,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: userContent }],
      },
      { timeout: REQUEST_TIMEOUT_MS },
    );

    let text = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        text = block.text;
        break;
      }
    }
    if (!text) return fallback(params.outputLanguage);

    const parsed = safeParseJSON(text);
    const report = coerceReport(parsed);
    return report ?? fallback(params.outputLanguage);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      console.warn('[claudeReportService] rate-limited');
    } else if (error instanceof Anthropic.AuthenticationError) {
      console.warn('[claudeReportService] auth — check CLAUDE_API_KEY');
    } else if (error instanceof Anthropic.APIError) {
      console.warn(`[claudeReportService] api ${error.status}: ${error.message}`);
    } else {
      console.warn('[claudeReportService] error:', error);
    }
    return fallback(params.outputLanguage);
  }
}
