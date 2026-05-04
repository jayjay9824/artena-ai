/**
 * Server-only Claude report service.
 * IMPORTANT: import this from route handlers / server components only.
 * Importing from a "use client" component will leak CLAUDE_API_KEY.
 *
 * Role: PRIMARY visual recognition + interpretation engine.
 *       Claude looks at the image, identifies the artwork visually,
 *       and writes the curator-tone interpretation in one streamed
 *       JSON response. Gemini OCR runs in parallel as a support
 *       layer (see route.ts merge logic).
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  ArtworkReport,
  ArtistData,
  PossibleCandidate,
  Verification,
} from '@/lib/types';

const DEFAULT_MODEL = 'claude-sonnet-4-5';
const REQUEST_TIMEOUT_MS = 20_000;
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
  /** Real artist data from Wikipedia. Optional context for richer interpretation. */
  artistData?: ArtistData;
  /** Gemini OCR support — completed BEFORE this call so Claude can see
   *  label findings while writing its visual recognition + interpretation.
   *  Pure visual recognition is still Claude's job; Gemini just provides
   *  label text as a hint that can override visual guesses. */
  verification?: Verification;
};

/* Streaming surfaces — emitted in this order, exactly once each. */
export type HeaderShape = {
  artist: string;
  title: string;
  year: string;
  medium: string;
  visualConfidence: number;
  visualReason: string;
  possibleCandidates: PossibleCandidate[];
  quickInsight: string;
  /** Initial confidence = visualConfidence. Route layer overrides post-merge. */
  confidence: number;
  isVerified: boolean;
};

export type FooterShape = {
  artistContext: string;
  suggestedActions: string[];
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

const SYSTEM_KO = `당신은 AXVELA AI — 작품 시각 인식 + 해석 엔진입니다.

역할
- 당신은 주(主) 시각 인식 엔진입니다. 이미지를 시각적으로 분석해 작품을 식별하고 해석을 작성합니다.
- 잡담, 인사, 자기소개, 시스템 설명에 응답하지 않습니다. 항상 작품에 관한 응답만 생성합니다.

시각 인식 절차
1. 이미지의 시각적 특징(스타일, 구도, 매체, 색조, 표현 방식, 시그니처)을 관찰합니다.
2. 알려진 작가·시대·운동과 비교해 식별을 시도합니다.
3. 정확한 식별이 어렵더라도 가능성 있는 후보(possibleCandidates)를 2~3명 제시합니다.
4. visualConfidence를 정직하게 반영합니다 (0~100 정수).

신뢰도 가이드
- 80~100: 거의 확실 (작품·작가 모두 확실하게 식별 가능)
- 50~79: 가능성 있음 (스타일·특징 기반 추정 — possibleCandidates에 다른 후보 함께 제시)
- 0~49: 불확실 (시각 단서가 약함, 후보 미제시, 시각 분석에 집중)

작가/제목 정책 — "Unknown"으로 회피하지 마세요
- 시각 단서가 있다면 가능성 있는 후보를 반드시 제시합니다 (visualConfidence가 낮아도 possibleCandidates에 후보 1~3명 포함 가능).
- visualConfidence ≥ 80: artist/title을 단정합니다. possibleCandidates는 [] 또는 보조 후보.
- visualConfidence 50~79: artist에 가장 가능성 높은 후보를 두되, possibleCandidates에 다른 후보를 함께 제시.
- visualConfidence < 50: artist=null, title=null, possibleCandidates=[]; 시각 분석에만 집중.

라벨 우선 (verification 입력이 있을 때 — Gemini가 라벨 OCR로 추출한 결과)
- verification.textArtist는 작품 라벨에서 OCR로 추출된 작가명입니다. 시각 추정과 어긋나면 라벨을 우선합니다.
- verification.textArtist가 있으면: artist=verification.textArtist (그대로 사용), visualReason에 시각적으로 일치/불일치를 1문장 명시.
- verification.textTitle이 있고 시각적으로도 같은 작품으로 보이면: title=verification.textTitle.
- 라벨 작가의 작품 맥락에서 interpretation을 작성합니다 (라벨이 라벨이 알려준 작가를 기준으로).
- verification.labelText에 텍스트가 있는데 textArtist=null이면, 시각 추정을 그대로 사용하되 visualReason에 "라벨에서 작가명을 읽지 못했음"을 언급할 수 있습니다.

표현 원칙
- 절제된, 프리미엄 큐레이터 톤. 수식어와 감탄을 최소화합니다.
- 각 텍스트 필드는 1~3 문장.
- "오류", "실패", "에러", "Error", "Failed" 같은 단어는 절대 쓰지 않습니다.
- visualConfidence가 낮을 때도 흥미로운 시각 분석을 제공합니다.

언어
- 한국어로만 응답합니다. 영어 단어를 섞지 않습니다.

출력 형식
다음 JSON 객체 하나만 출력합니다. 코드펜스, 마크다운, 추가 설명 일체 금지. 필드 순서는 반드시 아래 순서를 지켜 주세요 (스트리밍 처리에 영향).

{
  "artist": "string 또는 null (불확실 시 null)",
  "title": "string 또는 null",
  "year": "string 또는 null",
  "medium": "string 또는 null",
  "visualConfidence": 0,
  "visualReason": "이 작가/작품으로 추정한 이유 1문장",
  "possibleCandidates": [
    { "artist": "string", "confidence": 0, "reason": "string" }
  ],
  "quickInsight": "한 줄 핵심 (50자 내외)",
  "interpretation": "시각 단서 기반 해석 (2~3문장)",
  "artistContext": "작가 또는 장르 맥락 1~2문장. 단서 부족 시 빈 문자열",
  "suggestedActions": ["관련해서 찾아볼 만한 작품·작가 1~3개"]
}

confidence와 isVerified 필드는 출력하지 않습니다 (시스템이 visualConfidence와 후속 검증을 종합해 결정).`;

const SYSTEM_EN = `You are AXVELA AI — an artwork visual-recognition + interpretation engine.

Role
- You are the PRIMARY visual recognition engine. You analyze the image visually to identify the artwork and write its interpretation.
- Decline small-talk, greetings, self-description, or system queries. Always respond about the artwork only.

Visual recognition procedure
1. Observe the visual cues (style, composition, medium, palette, mark-making, signature).
2. Compare against known artists, periods, and movements to attempt identification.
3. When exact identity is uncertain, propose 2–3 possibleCandidates with reasons.
4. Reflect visualConfidence honestly (0–100 integer).

Confidence rubric
- 80–100: near-certain (artist and title both confidently identified)
- 50–79: plausible (style/feature-based estimate — include alternative possibleCandidates)
- 0–49: uncertain (weak visual cues, no candidates, focus on visual analysis)

Artist/title policy — DO NOT default to "Unknown"
- If visual cues exist, you MUST propose possibleCandidates (1–3) even when visualConfidence is moderate.
- visualConfidence ≥ 80: assert artist/title. possibleCandidates may be [] or secondary suggestions.
- visualConfidence 50–79: artist holds your most likely candidate, possibleCandidates lists alternatives.
- visualConfidence < 50: artist=null, title=null, possibleCandidates=[]; focus on visual analysis only.

Label priority (when a verification block is in the input — Gemini OCR support)
- verification.textArtist is the artist's name OCR'd from the artwork's wall label. If it disagrees with your visual guess, prefer the label.
- When verification.textArtist is present: set artist=verification.textArtist verbatim and note in visualReason whether your visual reading agrees with it.
- When verification.textTitle is present and the work appears to match: set title=verification.textTitle.
- Frame the interpretation around the label-named artist's body of work.
- When verification.labelText is non-empty but textArtist is null, keep your visual guess but you may note in visualReason that the label was unreadable.

Voice
- Restrained, premium curator tone. Minimize adjectives and exclamation.
- 1–3 sentences per text field.
- Never use the words "Error", "Failed", or apologies for not knowing.
- Even at low visualConfidence, return a useful visual reading.

Language
- Respond in English only. Do not mix Korean.

Output format
Output ONLY this JSON object. No code fences, no markdown, no surrounding text. Field order MUST match the schema below (streaming depends on it).

{
  "artist": "string or null (null when uncertain)",
  "title": "string or null",
  "year": "string or null",
  "medium": "string or null",
  "visualConfidence": 0,
  "visualReason": "one sentence on why you propose this artist/work",
  "possibleCandidates": [
    { "artist": "string", "confidence": 0, "reason": "string" }
  ],
  "quickInsight": "one-line key insight (~12 words)",
  "interpretation": "artwork reading grounded in visible cues (2–3 sentences)",
  "artistContext": "1–2 sentence artist or genre context, or empty string if unknown",
  "suggestedActions": ["1–3 related works or artists worth exploring"]
}

Do NOT output a "confidence" or "isVerified" field — the system derives those from visualConfidence and downstream verification.`;

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function hasMeaningfulInput(p: ReportParams): boolean {
  return Boolean(
    (p.imageBase64 && p.imageMimeType) ||
      (p.userQuestion && p.userQuestion.trim().length > 0) ||
      (p.insight &&
        Object.values(p.insight).some((v) => v !== undefined && v !== '')) ||
      p.artistData ||
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

  if (params.verification) {
    const v = params.verification;
    const block = ['verification (Gemini OCR support — label/QR text only):'];
    block.push(`  textArtist: ${v.textArtist ?? 'null'}`);
    block.push(`  textTitle: ${v.textTitle ?? 'null'}`);
    block.push(`  textConfidence: ${v.textConfidence}/100`);
    if (v.labelText) {
      // Truncate very long label text to keep prompt focused.
      const trimmed =
        v.labelText.length > 400 ? v.labelText.slice(0, 400) + '…' : v.labelText;
      block.push(`  labelText: "${trimmed}"`);
    }
    if (v.qrPayload) block.push(`  qrPayload: "${v.qrPayload}"`);
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
        ? '이 작품을 시각적으로 식별하고 해석해 주세요.'
        : 'Identify this work visually and write its interpretation.',
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

function pickStringOrEmpty(v: unknown): string {
  if (typeof v !== 'string') return '';
  return v.trim();
}

function coercePossibleCandidates(raw: unknown): PossibleCandidate[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const e = entry as Record<string, unknown>;
      const artist = typeof e.artist === 'string' ? e.artist.trim() : '';
      if (!artist) return null;
      const confidence =
        typeof e.confidence === 'number' && Number.isFinite(e.confidence)
          ? Math.max(0, Math.min(100, Math.round(e.confidence)))
          : 0;
      const reason = typeof e.reason === 'string' ? e.reason.trim() : '';
      return { artist, confidence, reason } as PossibleCandidate;
    })
    .filter((c): c is PossibleCandidate => c !== null)
    .slice(0, 5);
}

function coerceStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter((s) => s.length > 0)
    .slice(0, 5);
}

function coerceReport(raw: unknown): ArtworkReport | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const quickInsight = pickStringOrEmpty(r.quickInsight);
  const interpretation = pickStringOrEmpty(r.interpretation);
  if (!quickInsight || !interpretation) return null;

  const visualConfidence =
    typeof r.visualConfidence === 'number' && Number.isFinite(r.visualConfidence)
      ? Math.max(0, Math.min(100, Math.round(r.visualConfidence)))
      : 0;

  // null/undefined/non-string → empty (route layer applies localized fallback)
  const artist =
    typeof r.artist === 'string' && r.artist.trim().toLowerCase() !== 'null'
      ? r.artist.trim()
      : '';
  const title =
    typeof r.title === 'string' && r.title.trim().toLowerCase() !== 'null'
      ? r.title.trim()
      : '';
  const year =
    typeof r.year === 'string' && r.year.trim().toLowerCase() !== 'null'
      ? r.year.trim()
      : '';
  const medium =
    typeof r.medium === 'string' && r.medium.trim().toLowerCase() !== 'null'
      ? r.medium.trim()
      : '';

  return {
    artist,
    title,
    year,
    medium,
    quickInsight,
    interpretation,
    artistContext: pickStringOrEmpty(r.artistContext),
    confidence: visualConfidence, // initial; route may override
    isVerified: false, // system-controlled
    visualConfidence,
    visualReason: pickStringOrEmpty(r.visualReason),
    possibleCandidates: coercePossibleCandidates(r.possibleCandidates),
    suggestedActions: coerceStringArray(r.suggestedActions),
  };
}

/* Partial-JSON field extractors — reads "field":"..." even when the
 * closing quote has not arrived yet. Returns whatever string content
 * has streamed so far, plus a `complete` flag once the closing quote
 * is observed. Trailing partial escapes are intentionally kept out
 * of the result so we never emit half-decoded characters.
 */
function extractField(
  buf: string,
  field: string,
): { value: string; complete: boolean } {
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
      if (i + 1 >= buf.length) break;
      const next = buf[i + 1];
      if (next === 'n') result += '\n';
      else if (next === 't') result += '\t';
      else if (next === 'r') result += '\r';
      else if (next === '"') result += '"';
      else if (next === '\\') result += '\\';
      else if (next === '/') result += '/';
      else if (next === 'u') {
        if (i + 6 > buf.length) break;
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

/** Match `"field": <number>` (whitespace tolerant). Returns null if absent. */
function extractNumberField(buf: string, field: string): number | null {
  const re = new RegExp(`"${field}"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`);
  const m = buf.match(re);
  return m ? Number(m[1]) : null;
}

/** Slice and JSON.parse the closed-bracket array for `"field": [...]`. Returns
 *  null when the array hasn't fully streamed yet. */
function extractArrayField(buf: string, field: string): unknown[] | null {
  const startMarker = `"${field}":`;
  const idx = buf.indexOf(startMarker);
  if (idx === -1) return null;
  const arrayStart = buf.indexOf('[', idx);
  if (arrayStart === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = arrayStart; i < buf.length; i++) {
    const ch = buf[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (inString) {
      if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(buf.slice(arrayStart, i + 1));
          return Array.isArray(parsed) ? parsed : null;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function toHeader(report: ArtworkReport): HeaderShape {
  return {
    artist: report.artist,
    title: report.title,
    year: report.year,
    medium: report.medium,
    visualConfidence: report.visualConfidence ?? 0,
    visualReason: report.visualReason ?? '',
    possibleCandidates: report.possibleCandidates ?? [],
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
      artist: '',
      title: '',
      year: '',
      medium: '',
      quickInsight: '지금은 해석을 준비하지 못했습니다.',
      interpretation:
        '이미지에서 충분한 단서를 얻지 못했습니다. 라벨을 함께 촬영하시면 보다 정확한 해석이 가능합니다.',
      artistContext: '',
      confidence: 0,
      isVerified: false,
      visualConfidence: 0,
      visualReason: '',
      possibleCandidates: [],
      suggestedActions: [],
    };
  }
  return {
    artist: '',
    title: '',
    year: '',
    medium: '',
    quickInsight: 'A reading is not ready yet.',
    interpretation:
      'There were not enough visible cues for a confident interpretation. Capturing the label alongside the work will help return a more accurate reading.',
    artistContext: '',
    confidence: 0,
    isVerified: false,
    visualConfidence: 0,
    visualReason: '',
    possibleCandidates: [],
    suggestedActions: [],
  };
}

/* ─────────────────────────────────────────────
   Streaming entry — never throws
   ───────────────────────────────────────────── */

export async function streamClaudeArtworkReport(
  params: ReportParams,
  callbacks: StreamCallbacks,
): Promise<ArtworkReport> {
  const apiKey = process.env.CLAUDE_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !hasMeaningfulInput(params)) {
    const fb = fallback(params.outputLanguage);
    callbacks.onHeader?.(toHeader(fb));
    callbacks.onTextDelta?.(fb.interpretation);
    callbacks.onFooter?.({
      artistContext: fb.artistContext,
      suggestedActions: fb.suggestedActions ?? [],
    });
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
        // title/year/medium/visualConfidence/visualReason/possibleCandidates/
        // quickInsight are all complete (schema order).
        if (!headerSent && buffer.includes('"interpretation":')) {
          const visualConfidence =
            extractNumberField(buffer, 'visualConfidence') ?? 0;
          const candidatesRaw = extractArrayField(
            buffer,
            'possibleCandidates',
          );
          const possibleCandidates = coercePossibleCandidates(candidatesRaw);

          const artistRaw = extractField(buffer, 'artist').value;
          const titleRaw = extractField(buffer, 'title').value;
          const yearRaw = extractField(buffer, 'year').value;
          const mediumRaw = extractField(buffer, 'medium').value;

          // null → empty (route applies localized fallback)
          const stripNull = (s: string) =>
            s.toLowerCase() === 'null' ? '' : s;

          callbacks.onHeader?.({
            artist: stripNull(artistRaw),
            title: stripNull(titleRaw),
            year: stripNull(yearRaw),
            medium: stripNull(mediumRaw),
            visualConfidence,
            visualReason: extractField(buffer, 'visualReason').value,
            possibleCandidates,
            quickInsight: extractField(buffer, 'quickInsight').value,
            confidence: visualConfidence,
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

    // Finalize.
    const final = await stream.finalMessage();
    const text = final.content.find((b) => b.type === 'text')?.text ?? '';
    const parsed = safeParseJSON(text);
    const report = coerceReport(parsed) ?? fallback(params.outputLanguage);

    if (!headerSent) {
      callbacks.onHeader?.(toHeader(report));
      headerSent = true;
    }

    if (report.interpretation.length > lastInterpretation.length) {
      const tail = report.interpretation.slice(lastInterpretation.length);
      callbacks.onTextDelta?.(tail);
      lastInterpretation = report.interpretation;
    }

    callbacks.onFooter?.({
      artistContext: report.artistContext,
      suggestedActions: report.suggestedActions ?? [],
    });
    return report;
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      console.warn('[claudeReportService] rate-limited');
    } else if (error instanceof Anthropic.AuthenticationError) {
      console.warn('[claudeReportService] auth — check CLAUDE_API_KEY');
    } else if (error instanceof Anthropic.APIError) {
      console.warn(
        `[claudeReportService] api ${error.status}: ${error.message}`,
      );
    } else {
      console.warn(
        '[claudeReportService] stream error:',
        error instanceof Error ? error.message : 'unknown',
      );
    }
    const fb = fallback(params.outputLanguage);
    if (!headerSent) callbacks.onHeader?.(toHeader(fb));
    if (lastInterpretation.length === 0)
      callbacks.onTextDelta?.(fb.interpretation);
    callbacks.onFooter?.({
      artistContext: fb.artistContext,
      suggestedActions: fb.suggestedActions ?? [],
    });
    return fb;
  } finally {
    clearTimeout(timer);
  }
}

export async function generateClaudeArtworkReport(
  params: ReportParams,
): Promise<ArtworkReport> {
  return streamClaudeArtworkReport(params, {});
}
