import { streamClaudeArtworkReport } from '@/services/ai/claudeReportService';
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
} from '@/lib/types';

// Anthropic SDK requires Node runtime — not edge.
export const runtime = 'nodejs';

const VERIFIED_THRESHOLD = 75;
const PARTIAL_THRESHOLD = 40;
const FALLBACK_CONFIDENCE_CAP = 60;
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

  // Step 0.5 — Image similarity search (BEFORE Gemini).
  // Embedding is a deterministic stub today; the search returns top-K
  // catalog candidates ranked by cosine similarity. When real CLIP /
  // multimodal embedding lands, this layer becomes useful immediately.
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

  // Step 1 — Gemini verification (with candidate hints when available).
  const verification =
    imageBase64 && imageMimeType
      ? await verifyArtwork({
          imageBase64,
          imageMimeType,
          candidates: topSim >= IMAGE_MATCH_PARTIAL_THRESHOLD
            ? candidates
            : undefined,
        })
      : null;

  // Step 1.1 — Recognition decision layer.
  // Vector match takes precedence when similarity is strong; otherwise
  // we fall back to the existing Gemini-driven decision.
  let recognitionSource: RecognitionSource = 'none';
  let recognitionStatus: RecognitionStatus = 'NOT_FOUND';

  if (top && topSim >= IMAGE_MATCH_THRESHOLD) {
    recognitionSource = 'image_match';
    recognitionStatus = 'FOUND';
  } else if (top && topSim >= IMAGE_MATCH_PARTIAL_THRESHOLD) {
    // Plausible candidate; we still want Gemini's read alongside it.
    recognitionSource = 'image_match_partial';
    recognitionStatus = 'PARTIAL';
  } else if (
    verification &&
    verification.confidence >= VERIFIED_THRESHOLD &&
    (verification.artist || verification.title)
  ) {
    recognitionSource = 'gemini';
    recognitionStatus = 'FOUND';
  } else if (
    verification &&
    (verification.confidence >= PARTIAL_THRESHOLD ||
      (verification.labelText && verification.labelText.length > 0))
  ) {
    recognitionSource = 'gemini_partial';
    recognitionStatus = 'PARTIAL';
  } else if (imageBase64 && imageMimeType) {
    recognitionSource = 'claude_fallback';
    recognitionStatus = 'NOT_FOUND';
  }
  // else: no image at all → recognitionSource stays 'none'

  // Step 1.5 — Pick an artist name to look up real data for.
  // Prefer verified Gemini result; fall back to question heuristic.
  let artistName: string | null = null;
  if (recognitionSource === 'gemini' && verification?.artist) {
    artistName = verification.artist;
  } else if (userQuestion) {
    artistName = extractArtistName(userQuestion);
  }

  // Step 1.6 — Fetch real artist data (Wikipedia). Best-effort.
  const artistData = artistName ? await getArtistData(artistName) : null;

  // Step 2 — Open NDJSON stream and pump Claude through it.
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

      // Emit artistData early — UI can render the section while Claude
      // is still streaming the interpretation.
      if (artistData) {
        send({ type: 'artistData', data: artistData });
      }

      try {
        await streamClaudeArtworkReport(
          {
            imageBase64,
            imageMimeType,
            insight: pickInsightHint(data.insight),
            userQuestion,
            outputLanguage,
            verification: verification ?? undefined,
            artistData: artistData ?? undefined,
            recognitionSource,
            recognitionStatus,
          },
          {
            onHeader: (header) => {
              const merged = { ...header };

              // Final merge — strict by recognitionSource.
              switch (recognitionSource) {
                case 'image_match': {
                  // Vector-search top hit ≥0.85 — treat as ground truth.
                  if (top) {
                    merged.artist = top.artist;
                    merged.title = top.title;
                    if (top.year) merged.year = top.year;
                    if (top.medium) merged.medium = top.medium;
                  }
                  // Confidence reflects similarity (scaled 0.85–1.0 → 85–100)
                  merged.confidence = Math.max(85, Math.round(topSim * 100));
                  merged.isVerified = true;
                  break;
                }
                case 'image_match_partial': {
                  // 0.65–0.85: surface the candidate but don't assert verified.
                  if (top) {
                    merged.artist = top.artist;
                    merged.title = top.title;
                    if (top.year) merged.year = top.year;
                  }
                  merged.confidence = Math.round(topSim * 100);
                  merged.isVerified = false;
                  break;
                }
                case 'gemini': {
                  // Verified ground truth: artist/title from Gemini, true badge.
                  if (verification?.artist) merged.artist = verification.artist;
                  if (verification?.title) merged.title = verification.title;
                  if (verification) merged.confidence = verification.confidence;
                  merged.isVerified = true;
                  break;
                }
                case 'gemini_partial': {
                  // Don't assert artist/title — let Claude's hedged values stand.
                  if (verification) merged.confidence = verification.confidence;
                  merged.isVerified = false;
                  break;
                }
                case 'claude_fallback': {
                  merged.isVerified = false;
                  if (merged.confidence > FALLBACK_CONFIDENCE_CAP) {
                    merged.confidence = FALLBACK_CONFIDENCE_CAP;
                  }
                  // Soft messaging — when there's no label evidence, blank
                  // out the chip values so the UI can render '—' rather
                  // than the cold 'Unknown artist' string.
                  const hasLabel = Boolean(
                    verification?.labelText &&
                      verification.labelText.length > 0,
                  );
                  if (!hasLabel) {
                    if (merged.artist === 'Unknown artist') merged.artist = '';
                    if (merged.title === 'Artwork image') merged.title = '';
                  }
                  break;
                }
                case 'none':
                default: {
                  merged.isVerified = false;
                  break;
                }
              }

              // Question-only path: surface canonical artist when external
              // data has it (e.g. "Mark Rothko" question → Wikipedia hit).
              if (
                recognitionSource === 'none' &&
                artistData?.artist
              ) {
                merged.artist = artistData.artist;
              }

              send({
                type: 'header',
                data: {
                  ...merged,
                  recognitionSource,
                  recognitionStatus,
                },
              });
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
        // streamClaudeArtworkReport never throws, but defense in depth.
      } finally {
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
