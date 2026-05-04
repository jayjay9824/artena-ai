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

  // Step 0.5 — Image similarity search (catalog vector match). Cheap, in-memory.
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

  // Step 1 — Gemini OCR support (await before Claude). This is the
  // "Gemini support verification" step. It runs FIRST so Claude can see
  // the label findings while writing its visual recognition + report.
  // Latency cost: ~1–2s. Accuracy benefit: Claude's interpretation aligns
  // with the label-corrected artist (no chip/text mismatch).
  const geminiVerification: Verification | null =
    imageBase64 && imageMimeType
      ? await verifyArtwork({ imageBase64, imageMimeType })
      : null;

  // Localized "no exact identification" copy for visual_uncertain branch.
  const ARTIST_UNCONFIRMED =
    outputLanguage === 'ko' ? '작가 미확인' : 'Artist unconfirmed';
  const TITLE_UNCONFIRMED =
    outputLanguage === 'ko' ? '이미지 기반 분석' : 'Image-based analysis';

  /** Vector + Claude + Gemini → final recognition source/status. */
  const decideRecognition = (
    header: HeaderShape,
    gemini: Verification | null,
  ): { source: RecognitionSource; status: RecognitionStatus } => {
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

    if (claudeStrong && claudeAndGeminiAgree) {
      return { source: 'claude_visual_gemini_supported', status: 'FOUND' };
    }
    if (claudeStrong) {
      return { source: 'claude_visual', status: 'FOUND' };
    }
    if (claudeMedium && claudeAndGeminiAgree) {
      return { source: 'claude_visual_gemini_supported', status: 'FOUND' };
    }
    if (claudeMedium) {
      return { source: 'claude_visual', status: 'PARTIAL' };
    }
    if (
      geminiHasArtist &&
      (gemini?.textConfidence ?? 0) >= GEMINI_LABEL_FOUND_THRESHOLD
    ) {
      return { source: 'gemini_label', status: 'FOUND' };
    }
    if (geminiHasArtist) {
      return { source: 'gemini_label', status: 'PARTIAL' };
    }
    if (!imageBase64 || !imageMimeType) {
      return { source: 'none', status: 'NOT_FOUND' };
    }
    return { source: 'visual_uncertain', status: 'NOT_FOUND' };
  };

  // Step 2 — Open NDJSON stream and run Claude (single call). Because
  // Gemini already completed, header merge happens synchronously inside
  // onHeader — no async gating needed.
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

      let headerSent = false;
      let resolvedArtist: string | null = null;
      let recognitionSource: RecognitionSource = 'none';
      let recognitionStatus: RecognitionStatus = 'NOT_FOUND';
      let artistDataKickedOff = false;

      const kickWikipedia = (artistName: string) => {
        if (artistDataKickedOff) return;
        artistDataKickedOff = true;
        getArtistData(artistName)
          .then((ad) => {
            if (ad) send({ type: 'artistData', data: ad });
          })
          .catch(() => {
            /* silent — artist info panel just won't render */
          });
      };

      try {
        await streamClaudeArtworkReport(
          {
            imageBase64,
            imageMimeType,
            insight: pickInsightHint(data.insight),
            userQuestion,
            outputLanguage,
            verification: geminiVerification ?? undefined,
          },
          {
            onHeader: (header) => {
              const merged: HeaderShape = { ...header };
              const decision = decideRecognition(merged, geminiVerification);
              recognitionSource = decision.source;
              recognitionStatus = decision.status;

              switch (recognitionSource) {
                case 'image_match': {
                  if (top) {
                    merged.artist = top.artist;
                    merged.title = top.title;
                    if (top.year) merged.year = top.year;
                    if (top.medium) merged.medium = top.medium;
                  }
                  merged.confidence = Math.max(85, Math.round(topSim * 100));
                  merged.isVerified = true;
                  break;
                }
                case 'image_match_partial': {
                  if (top) {
                    merged.artist = top.artist;
                    merged.title = top.title;
                    if (top.year) merged.year = top.year;
                  }
                  merged.confidence = Math.round(topSim * 100);
                  merged.isVerified = false;
                  break;
                }
                case 'claude_visual_gemini_supported': {
                  // Claude already received verification, so its primary
                  // artist may already match Gemini. Still: prefer Gemini's
                  // OCR'd name if Claude diverged at the primary slot.
                  if (geminiVerification?.textArtist) {
                    const claudePrimary = normalizeName(merged.artist);
                    const geminiArtist = normalizeName(
                      geminiVerification.textArtist,
                    );
                    if (!namesAgree(claudePrimary, geminiArtist)) {
                      merged.artist = geminiVerification.textArtist;
                    }
                  }
                  if (geminiVerification?.textTitle && !merged.title) {
                    merged.title = geminiVerification.textTitle;
                  }
                  const score = Math.max(
                    merged.visualConfidence,
                    geminiVerification?.textConfidence ?? 0,
                  );
                  merged.confidence = Math.min(95, score + 5);
                  merged.isVerified = true;
                  break;
                }
                case 'claude_visual': {
                  merged.confidence = merged.visualConfidence;
                  merged.isVerified = decision.status === 'FOUND';
                  break;
                }
                case 'gemini_label': {
                  if (geminiVerification?.textArtist) {
                    merged.artist = geminiVerification.textArtist;
                  }
                  if (geminiVerification?.textTitle) {
                    merged.title = geminiVerification.textTitle;
                  }
                  merged.confidence = geminiVerification?.textConfidence ?? 50;
                  merged.isVerified = decision.status === 'FOUND';
                  break;
                }
                case 'visual_uncertain': {
                  merged.confidence = Math.min(50, merged.visualConfidence);
                  merged.isVerified = false;
                  if (!merged.artist) merged.artist = ARTIST_UNCONFIRMED;
                  if (!merged.title) merged.title = TITLE_UNCONFIRMED;
                  break;
                }
                case 'none':
                default: {
                  merged.isVerified = false;
                  break;
                }
              }

              send({
                type: 'header',
                data: { ...merged, recognitionSource, recognitionStatus },
              });
              headerSent = true;
              resolvedArtist = merged.artist;

              // Wikipedia lookup — only on real artist names.
              if (
                resolvedArtist &&
                resolvedArtist !== ARTIST_UNCONFIRMED &&
                resolvedArtist !== 'Unknown artist'
              ) {
                kickWikipedia(resolvedArtist);
              } else if (userQuestion) {
                const guessed = extractArtistName(userQuestion);
                if (guessed) kickWikipedia(guessed);
              }
            },
            onTextDelta: (delta) => {
              send({ type: 'text', data: delta });
            },
            onFooter: (footer) => {
              send({ type: 'footer', data: footer });
            },
          },
        );
      } catch {
        /* streamClaudeArtworkReport never throws — defense in depth */
      } finally {
        if (!headerSent) {
          // Edge: Claude returned nothing useful. Synthesize minimal header
          // so the UI doesn't hang on the analyzing screen.
          send({
            type: 'header',
            data: {
              artist: ARTIST_UNCONFIRMED,
              title: TITLE_UNCONFIRMED,
              year: '',
              medium: '',
              visualConfidence: 0,
              visualReason: '',
              possibleCandidates: [],
              quickInsight: '',
              confidence: 0,
              isVerified: false,
              recognitionSource: 'visual_uncertain' as RecognitionSource,
              recognitionStatus: 'NOT_FOUND' as RecognitionStatus,
            },
          });
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
