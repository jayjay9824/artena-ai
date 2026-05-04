import {
  streamClaudeArtworkReport,
  type HeaderShape,
  type FooterShape,
} from '@/services/ai/claudeReportService';
import { verifyArtwork } from '@/services/ai/geminiVerificationService';
import {
  getArtistData,
  extractArtistName,
} from '@/services/artworkDataService';
import { generateImageEmbedding } from '@/services/ai/embeddingService';
import { searchSimilarArtworks } from '@/services/vectorSearchService';
import type {
  RecognitionSource,
  RecognitionStatus,
  ArtworkCandidate,
  Verification,
} from '@/lib/types';

// Anthropic SDK requires Node runtime.
export const runtime = 'nodejs';

const VISUAL_FOUND_THRESHOLD = 80; // Claude visualConfidence FOUND
const VISUAL_PARTIAL_THRESHOLD = 50; // Claude visualConfidence PARTIAL
const GEMINI_LABEL_FOUND_THRESHOLD = 80; // Gemini textConfidence FOUND
// Vector-similarity thresholds (cosine, 0–1)
const IMAGE_MATCH_THRESHOLD = 0.85;
const IMAGE_MATCH_PARTIAL_THRESHOLD = 0.65;

type ReportRequest = {
  imageBase64?: string;
  imageMimeType?: string;
  insight?: {
    artist?: string;
    title?: string;
    year?: string;
    medium?: string;
    confidence?: number;
  };
  userQuestion?: string;
  outputLanguage?: 'ko' | 'en';
};

function isLanguage(v: unknown): v is 'ko' | 'en' {
  return v === 'ko' || v === 'en';
}

function pickStringField(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function pickInsightHint(v: unknown): ReportRequest['insight'] {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  return {
    artist: pickStringField(o.artist),
    title: pickStringField(o.title),
    year: pickStringField(o.year),
    medium: pickStringField(o.medium),
    confidence: typeof o.confidence === 'number' ? o.confidence : undefined,
  };
}

function normalizeName(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().trim();
}

/** Loose match: equality OR mutual substring (handles "van Gogh" ⊂ "Vincent van Gogh"). */
function namesAgree(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 3 && b.includes(a)) return true;
  if (b.length >= 3 && a.includes(b)) return true;
  return false;
}

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const data =
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>)
      : {};

  const imageBase64 = pickStringField(data.imageBase64);
  const imageMimeType = pickStringField(data.imageMimeType);
  const userQuestion = pickStringField(data.userQuestion);
  const outputLanguage: 'ko' | 'en' = isLanguage(data.outputLanguage)
    ? data.outputLanguage
    : 'ko';

  // Step 0.5 — Image similarity search (catalog vector match).
  let candidates: ArtworkCandidate[] = [];
  if (imageBase64 && imageMimeType) {
    try {
      const embedding = await generateImageEmbedding(imageBase64);
      candidates = await searchSimilarArtworks(embedding);
    } catch {
      candidates = [];
    }
  }
  const top = candidates[0] ?? null;
  const topSim = top?.similarity ?? 0;

  // Step 1 — Kick off Gemini OCR in parallel with Claude. Gemini is the
  // SUPPORT layer: it only extracts label text / QR / textArtist. Visual
  // recognition is owned by Claude (called below in the streaming step).
  const geminiPromise: Promise<Verification | null> =
    imageBase64 && imageMimeType
      ? verifyArtwork({ imageBase64, imageMimeType })
      : Promise.resolve(null);

  // Localized "no exact identification" copy for visual_uncertain branch.
  const ARTIST_UNCONFIRMED =
    outputLanguage === 'ko' ? '작가 미확인' : 'Artist unconfirmed';
  const TITLE_UNCONFIRMED =
    outputLanguage === 'ko' ? '이미지 기반 분석' : 'Image-based analysis';

  // Step 2 — Open NDJSON stream and orchestrate.
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (event: object) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
        } catch {
          /* controller may already be closed */
        }
      };

      // Header gating state: hold Claude's header until Gemini completes
      // so the merge has both signals in hand. Gemini almost always wins
      // the race (1–2s vs Claude's 3–4s for the header), but be defensive.
      let geminiVerification: Verification | null = null;
      let geminiDone = false;
      let claudeHeaderHeld: HeaderShape | null = null;
      let footerHeld: FooterShape | null = null;
      let textBuffer = '';
      let headerSent = false;
      let recognitionSource: RecognitionSource = 'none';
      let recognitionStatus: RecognitionStatus = 'NOT_FOUND';
      let resolvedArtist: string | null = null;
      let artistDataKickedOff = false;

      const decideRecognition = (
        header: HeaderShape,
        gemini: Verification | null,
      ): { source: RecognitionSource; status: RecognitionStatus } => {
        // 1) Catalog vector match wins everything else.
        if (top && topSim >= IMAGE_MATCH_THRESHOLD) {
          return { source: 'image_match', status: 'FOUND' };
        }
        if (top && topSim >= IMAGE_MATCH_PARTIAL_THRESHOLD) {
          return { source: 'image_match_partial', status: 'PARTIAL' };
        }

        const visualConf = header.visualConfidence;
        const claudeArtist = normalizeName(header.artist);
        const claudeCandidates = [
          claudeArtist,
          ...header.possibleCandidates.map((c) => normalizeName(c.artist)),
        ].filter((s) => s.length > 0);

        const geminiArtist = normalizeName(gemini?.textArtist);
        const geminiHasArtist = geminiArtist.length > 0;

        const claudeStrong =
          visualConf >= VISUAL_FOUND_THRESHOLD && claudeArtist.length > 0;
        const claudeMedium =
          visualConf >= VISUAL_PARTIAL_THRESHOLD &&
          visualConf < VISUAL_FOUND_THRESHOLD;

        const claudeAndGeminiAgree =
          geminiHasArtist &&
          claudeCandidates.some((c) => namesAgree(c, geminiArtist));

        // 2) Claude high confidence + Gemini OCR confirms one of Claude's candidates.
        if (claudeStrong && claudeAndGeminiAgree) {
          return {
            source: 'claude_visual_gemini_supported',
            status: 'FOUND',
          };
        }

        // 3) Claude high confidence (Gemini absent or disagrees).
        if (claudeStrong) {
          return { source: 'claude_visual', status: 'FOUND' };
        }

        // 4) Claude medium AND Gemini OCR agrees → boost to FOUND.
        if (claudeMedium && claudeAndGeminiAgree) {
          return {
            source: 'claude_visual_gemini_supported',
            status: 'FOUND',
          };
        }

        // 5) Claude medium alone → claude_visual PARTIAL.
        if (claudeMedium) {
          return { source: 'claude_visual', status: 'PARTIAL' };
        }

        // 6) Claude weak but Gemini found a label artist.
        if (
          geminiHasArtist &&
          (gemini?.textConfidence ?? 0) >= GEMINI_LABEL_FOUND_THRESHOLD
        ) {
          return { source: 'gemini_label', status: 'FOUND' };
        }
        if (geminiHasArtist) {
          return { source: 'gemini_label', status: 'PARTIAL' };
        }

        // 7) No image at all → none. Otherwise visual_uncertain.
        if (!imageBase64 || !imageMimeType) {
          return { source: 'none', status: 'NOT_FOUND' };
        }
        return { source: 'visual_uncertain', status: 'NOT_FOUND' };
      };

      const tryFlushHeader = () => {
        if (headerSent) return;
        if (!claudeHeaderHeld || !geminiDone) return;

        const header: HeaderShape = { ...claudeHeaderHeld };
        const decision = decideRecognition(header, geminiVerification);
        recognitionSource = decision.source;
        recognitionStatus = decision.status;

        switch (recognitionSource) {
          case 'image_match': {
            if (top) {
              header.artist = top.artist;
              header.title = top.title;
              if (top.year) header.year = top.year;
              if (top.medium) header.medium = top.medium;
            }
            header.confidence = Math.max(85, Math.round(topSim * 100));
            header.isVerified = true;
            break;
          }
          case 'image_match_partial': {
            if (top) {
              header.artist = top.artist;
              header.title = top.title;
              if (top.year) header.year = top.year;
            }
            header.confidence = Math.round(topSim * 100);
            header.isVerified = false;
            break;
          }
          case 'claude_visual_gemini_supported': {
            // Prefer Gemini's OCR'd artist when Claude's primary disagreed
            // with the label but a candidate matched.
            if (geminiVerification?.textArtist) {
              const claudePrimary = normalizeName(header.artist);
              const geminiArtist = normalizeName(
                geminiVerification.textArtist,
              );
              if (!namesAgree(claudePrimary, geminiArtist)) {
                header.artist = geminiVerification.textArtist;
              }
            }
            if (geminiVerification?.textTitle && !header.title) {
              header.title = geminiVerification.textTitle;
            }
            const merged = Math.max(
              header.visualConfidence,
              geminiVerification?.textConfidence ?? 0,
            );
            header.confidence = Math.min(95, merged + 5);
            header.isVerified = true;
            break;
          }
          case 'claude_visual': {
            header.confidence = header.visualConfidence;
            header.isVerified = decision.status === 'FOUND';
            break;
          }
          case 'gemini_label': {
            // Claude visual was weak. Use Gemini's OCR'd artist verbatim.
            if (geminiVerification?.textArtist) {
              header.artist = geminiVerification.textArtist;
            }
            if (geminiVerification?.textTitle) {
              header.title = geminiVerification.textTitle;
            }
            header.confidence = geminiVerification?.textConfidence ?? 50;
            header.isVerified = decision.status === 'FOUND';
            break;
          }
          case 'visual_uncertain': {
            header.confidence = Math.min(50, header.visualConfidence);
            header.isVerified = false;
            // Soft, localized "no identification" copy — never "Unknown".
            if (!header.artist) header.artist = ARTIST_UNCONFIRMED;
            if (!header.title) header.title = TITLE_UNCONFIRMED;
            break;
          }
          case 'none':
          default: {
            header.isVerified = false;
            break;
          }
        }

        send({
          type: 'header',
          data: { ...header, recognitionSource, recognitionStatus },
        });
        headerSent = true;
        resolvedArtist = header.artist;

        // Flush any text that arrived before header could be sent.
        if (textBuffer.length > 0) {
          send({ type: 'text', data: textBuffer });
          textBuffer = '';
        }
        if (footerHeld) {
          send({ type: 'footer', data: footerHeld });
          footerHeld = null;
        }

        // Step 3 — Wikipedia lookup (post-recognition). Best-effort.
        // Only runs when we have a real artist name, NOT for the
        // localized "Artist unconfirmed" / "작가 미확인" placeholders.
        if (
          !artistDataKickedOff &&
          resolvedArtist &&
          resolvedArtist !== ARTIST_UNCONFIRMED &&
          resolvedArtist !== 'Unknown artist'
        ) {
          artistDataKickedOff = true;
          getArtistData(resolvedArtist)
            .then((ad) => {
              if (ad) send({ type: 'artistData', data: ad });
            })
            .catch(() => {
              /* silent — artist info panel just won't render */
            });
        } else if (!artistDataKickedOff && userQuestion) {
          // Question-only path: pull artist from the question heuristic.
          const guessed = extractArtistName(userQuestion);
          if (guessed) {
            artistDataKickedOff = true;
            getArtistData(guessed)
              .then((ad) => {
                if (ad) send({ type: 'artistData', data: ad });
              })
              .catch(() => {});
          }
        }
      };

      // Watch Gemini result.
      geminiPromise
        .then((v) => {
          geminiVerification = v;
        })
        .catch(() => {
          geminiVerification = null;
        })
        .finally(() => {
          geminiDone = true;
          tryFlushHeader();
        });

      try {
        await streamClaudeArtworkReport(
          {
            imageBase64,
            imageMimeType,
            insight: pickInsightHint(data.insight),
            userQuestion,
            outputLanguage,
          },
          {
            onHeader: (header) => {
              claudeHeaderHeld = header;
              tryFlushHeader();
            },
            onTextDelta: (delta) => {
              if (!headerSent) {
                textBuffer += delta;
              } else {
                send({ type: 'text', data: delta });
              }
            },
            onFooter: (footer) => {
              if (!headerSent) {
                footerHeld = footer;
              } else {
                send({ type: 'footer', data: footer });
              }
            },
          },
        );
      } catch {
        /* streamClaudeArtworkReport never throws — defense in depth */
      } finally {
        // Edge: Claude finished (or failed) but Gemini hasn't completed.
        // Wait briefly for Gemini, then force-flush whatever we have.
        if (!geminiDone) {
          await Promise.race([
            geminiPromise.catch(() => null),
            new Promise((r) => setTimeout(r, 1500)),
          ]);
          geminiDone = true;
          tryFlushHeader();
        }
        // Edge: streamClaude returned without ever calling onHeader.
        if (!headerSent && claudeHeaderHeld === null) {
          // Synthesize a minimal header so the UI doesn't hang.
          claudeHeaderHeld = {
            artist: '',
            title: '',
            year: '',
            medium: '',
            visualConfidence: 0,
            visualReason: '',
            possibleCandidates: [],
            quickInsight: '',
            confidence: 0,
            isVerified: false,
          };
          tryFlushHeader();
        }
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Content-Type-Options': 'nosniff',
      'X-Accel-Buffering': 'no',
    },
  });
}

export async function GET() {
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
}
