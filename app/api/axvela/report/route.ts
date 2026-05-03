import { streamClaudeArtworkReport } from '@/services/ai/claudeReportService';
import { verifyArtwork } from '@/services/ai/geminiVerificationService';
import {
  getArtistData,
  extractArtistName,
} from '@/services/artworkDataService';

// Anthropic SDK requires Node runtime — not edge.
export const runtime = 'nodejs';

const VERIFICATION_THRESHOLD = 75;

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

  // Step 1 — Gemini verification (blocking precondition; happens before the
  // stream opens, so the first byte to the client lands once Claude starts).
  const verification =
    imageBase64 && imageMimeType
      ? await verifyArtwork({ imageBase64, imageMimeType })
      : null;

  // Step 1.5 — Pick an artist name to look up.
  // Priority: high-confidence verification > question heuristic > none.
  let artistName: string | null = null;
  if (
    verification &&
    verification.confidence >= VERIFICATION_THRESHOLD &&
    verification.artist
  ) {
    artistName = verification.artist;
  } else if (userQuestion) {
    artistName = extractArtistName(userQuestion);
  }

  // Step 1.6 — Fetch real artist data from external source. Best-effort,
  // returns null on any failure → falls through to AI-only.
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
          },
          {
            onHeader: (header) => {
              const merged = { ...header };
              if (verification) {
                merged.confidence = verification.confidence;
                merged.isVerified =
                  verification.confidence >= VERIFICATION_THRESHOLD;

                if (verification.confidence >= VERIFICATION_THRESHOLD) {
                  if (verification.artist) merged.artist = verification.artist;
                  if (verification.title) merged.title = verification.title;
                }
              }
              // If artistData arrived from a question-only flow (no
              // verification), still surface the canonical artist name.
              if (!verification && artistData?.artist) {
                merged.artist = artistData.artist;
              }
              send({ type: 'header', data: merged });
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
