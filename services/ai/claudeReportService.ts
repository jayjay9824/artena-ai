/**
 * Server-only Claude report service.
 * IMPORTANT: import this from route handlers / server components only.
 * Importing from a "use client" component will leak CLAUDE_API_KEY into the bundle.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ArtworkReport, Verification, ArtistData } from '@/lib/types';

const DEFAULT_MODEL = 'claude-sonnet-4-5';
const REQUEST_TIMEOUT_MS = 15_000;
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
  /** Real artist data from external source (Wikipedia). Ground truth. */
  artistData?: ArtistData;
};

/* Streaming surfaces — emitted in this order, exactly once each. */
export type HeaderShape = {
  artist: string;
  title: string;
  year: string;
  medium: string;
  quickInsight: string;
  confidence: number;
  isVerified: boolean;
};

export type FooterShape = {
  artistContext: string;
};

export type StreamCallbacks = {
  onHeader?: (header: HeaderShape) => void;
  onTextDelta?: (delta: string) => void;
  onFooter?: (footer: FooterShape) => void;
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
- verification.confidence가 75 이상이면 verification.artist와 verification.title을 결과에 그대로 반영합니다. 자체적으로 다른 작가/제목을 추측해 사용하지 않습니다.
- verification.confidence가 75 미만이면 verification 결과를 신뢰하지 않습니다 — artist/title은 위 기본값을 사용하고, interpretation에 "라벨을 함께 촬영하면 보다 정확한 해석이 가능합니다" 류의 안내를 자연스럽게 포함합니다.
- verification.labelText가 있으면 해석에 참고만 합니다 (단, labelText 내용을 단정적 사실로 단언하지 않습니다).

실제 작가 데이터 처리 (입력에 artistData 블록이 포함된 경우 — ground truth)
- artistData.bio는 실제 외부 출처(Wikipedia 등)에서 가져온 사실 정보입니다. 작가 맥락은 본인 지식이 아닌 artistData를 우선 근거로 사용합니다.
- artistData.styles가 있으면 스타일/사조 언급에 활용하되, 이미지의 시각 단서가 있을 때는 시각 단서를 우선합니다.
- artistData.sampleWorks가 있으면 대표 작품으로 자연스럽게 인용할 수 있으나, 위치/연도/소장처는 단언하지 않습니다.
- artistData가 없으면 일반 지식으로 응답합니다 (단, 추측 금지 규칙 유지).

공통 규칙
- 단정적 사실 단언 금지. "~로 보입니다" 같은 관찰 기반 서술을 사용합니다.

언어
- 한국어로만 응답합니다. 영어 단어를 섞지 않습니다.

출력 형식
다음 JSON 객체 하나만 출력합니다. 코드펜스, 마크다운, 추가 설명 일체 금지. 필드 순서는 반드시 아래 순서를 지켜 주세요 (스트리밍 처리에 영향을 줍니다).

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
- If verification.confidence ≥ 75: use verification.artist and verification.title verbatim. Do not substitute your own guess.
- If verification.confidence < 75: do not trust the verification — use the defaults above, and naturally suggest in interpretation that scanning the label will yield a more accurate reading.
- If verification.labelText is present: use it as context only — do not assert its contents as fact.

Real artist data handling (when an artistData block IS present — ground truth)
- artistData.bio comes from a real external source (Wikipedia). Use it as the ground truth for biographical and contextual statements about the artist; prefer it over your own training knowledge if they differ.
- If artistData.styles is present, use those style/movement labels in your wording, but defer to visible cues from the image when available.
- If artistData.sampleWorks is present, you may cite those titles naturally; do not assert location/year/owner of any specific work.
- When artistData is absent, fall back to your general knowledge under the no-guessing rules above.

Common rules
- Avoid factual assertions. Use observation-based phrasing ("appears to", "shows characteristics of").

Language
- Respond in English only. Do not mix Korean.

Output format
Output ONLY this JSON object. No code fences, no markdown, no surrounding text. The field order MUST match the schema below (streaming depends on it).

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
      p.verification ||
      p.artistData,
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

  if (params.artistData) {
    const a = params.artistData;
    const block = [
      `artistData (real source — ${a.source}, ground truth):`,
      `  artist: ${a.artist}`,
      `  bio: ${a.bio}`,
    ];
    if (a.styles.length) block.push(`  styles: ${a.styles.join(', ')}`);
    if (a.sampleWorks.length) {
      block.push(`  sampleWorks: ${a.sampleWorks.join(', ')}`);
    }
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
    isVerified: false, // system-controlled, set in route layer
  };
}

/* Partial-JSON field extractor — reads "field":"..." even when the
 * closing quote has not arrived yet. Returns whatever string content
 * has streamed so far, plus a `complete` flag once the closing quote
 * is observed. Trailing partial escapes are intentionally kept out
 * of the result so we never emit half-decoded characters.
 */
function extractField(buf: string, field: string): { value: string; complete: boolean } {
  const startMarker = `"${field}":"`;
  const idx = buf.indexOf(startMarker);
  if (idx === -1) return { value: '', complete: false };
  let i = idx + startMarker.length;
  let result = '';
  let complete = false;

  while (i < buf.length) {
    const ch = buf[i];
    if (ch === '"') {
      complete = true;
      break;
    }
    if (ch === '\\') {
      if (i + 1 >= buf.length) break; // partial escape — wait
      const next = buf[i + 1];
      if (next === 'n') result += '\n';
      else if (next === 't') result += '\t';
      else if (next === 'r') result += '\r';
      else if (next === '"') result += '"';
      else if (next === '\\') result += '\\';
      else if (next === '/') result += '/';
      else if (next === 'u') {
        if (i + 6 > buf.length) break; // partial \u escape
        const hex = buf.slice(i + 2, i + 6);
        if (/^[0-9a-fA-F]{4}$/.test(hex)) {
          result += String.fromCharCode(parseInt(hex, 16));
          i += 6;
          continue;
        }
        break;
      } else {
        result += next;
      }
      i += 2;
      continue;
    }
    result += ch;
    i++;
  }

  return { value: result, complete };
}

function toHeader(report: ArtworkReport): HeaderShape {
  return {
    artist: report.artist,
    title: report.title,
    year: report.year,
    medium: report.medium,
    quickInsight: report.quickInsight,
    confidence: report.confidence,
    isVerified: report.isVerified,
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
   Streaming entry — never throws
   ───────────────────────────────────────────── */

export async function streamClaudeArtworkReport(
  params: ReportParams,
  callbacks: StreamCallbacks,
): Promise<ArtworkReport> {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey || !hasMeaningfulInput(params)) {
    const fb = fallback(params.outputLanguage);
    callbacks.onHeader?.(toHeader(fb));
    callbacks.onTextDelta?.(fb.interpretation);
    callbacks.onFooter?.({ artistContext: fb.artistContext });
    return fb;
  }

  const model = process.env.CLAUDE_MODEL || DEFAULT_MODEL;
  const system = params.outputLanguage === 'ko' ? SYSTEM_KO : SYSTEM_EN;
  const userContent = buildUserContent(params);
  const client = new Anthropic({ apiKey });

  let buffer = '';
  let headerSent = false;
  let lastInterpretation = '';

  const abortCtrl = new AbortController();
  const timer = setTimeout(() => abortCtrl.abort(), REQUEST_TIMEOUT_MS);

  try {
    const stream = client.messages.stream(
      {
        model,
        max_tokens: MAX_TOKENS,
        system: [
          { type: 'text', text: system, cache_control: { type: 'ephemeral' } },
        ],
        messages: [{ role: 'user', content: userContent }],
      },
      { signal: abortCtrl.signal },
    );

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        buffer += event.delta.text;

        // Header: emit once we see "interpretation": — by then artist/
        // title/year/medium/quickInsight have all completed (schema order).
        if (!headerSent && buffer.includes('"interpretation":')) {
          callbacks.onHeader?.({
            artist: extractField(buffer, 'artist').value || 'Unknown artist',
            title: extractField(buffer, 'title').value || 'Artwork image',
            year: extractField(buffer, 'year').value || 'Analysis pending',
            medium:
              extractField(buffer, 'medium').value || 'Image-based analysis',
            quickInsight: extractField(buffer, 'quickInsight').value || '',
            confidence: 50, // placeholder — overridden by route's verification merge
            isVerified: false,
          });
          headerSent = true;
        }

        if (headerSent) {
          const current = extractField(buffer, 'interpretation');
          if (current.value.length > lastInterpretation.length) {
            const delta = current.value.slice(lastInterpretation.length);
            callbacks.onTextDelta?.(delta);
            lastInterpretation = current.value;
          }
        }
      }
    }

    // Finalize — extract artistContext from the completed message.
    const final = await stream.finalMessage();
    const text = final.content.find((b) => b.type === 'text')?.text ?? '';
    const parsed = safeParseJSON(text);
    const report = coerceReport(parsed) ?? fallback(params.outputLanguage);

    // Header emit fallback (very short responses that bypass our marker).
    if (!headerSent) {
      callbacks.onHeader?.(toHeader(report));
      headerSent = true;
    }

    // Flush any remaining interpretation tail (defensive — usually a no-op).
    if (report.interpretation.length > lastInterpretation.length) {
      const tail = report.interpretation.slice(lastInterpretation.length);
      callbacks.onTextDelta?.(tail);
      lastInterpretation = report.interpretation;
    }

    callbacks.onFooter?.({ artistContext: report.artistContext });
    return report;
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      console.warn('[claudeReportService] rate-limited');
    } else if (error instanceof Anthropic.AuthenticationError) {
      console.warn('[claudeReportService] auth — check CLAUDE_API_KEY');
    } else if (error instanceof Anthropic.APIError) {
      console.warn(`[claudeReportService] api ${error.status}: ${error.message}`);
    } else {
      console.warn(
        '[claudeReportService] stream error:',
        error instanceof Error ? error.message : 'unknown',
      );
    }
    const fb = fallback(params.outputLanguage);
    if (!headerSent) callbacks.onHeader?.(toHeader(fb));
    if (lastInterpretation.length === 0) callbacks.onTextDelta?.(fb.interpretation);
    callbacks.onFooter?.({ artistContext: fb.artistContext });
    return fb;
  } finally {
    clearTimeout(timer);
  }
}

/* ─────────────────────────────────────────────
   Non-streaming entry — kept for callers that
   don't need progressive output (none in app right
   now; preserved as a stable building block).
   ───────────────────────────────────────────── */

export async function generateClaudeArtworkReport(
  params: ReportParams,
): Promise<ArtworkReport> {
  // Streaming entry already returns the full reconstructed report.
  return streamClaudeArtworkReport(params, {});
}
