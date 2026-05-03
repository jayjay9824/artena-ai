import { NextResponse } from 'next/server';
import { generateClaudeArtworkReport } from '@/services/ai/claudeReportService';
import { verifyArtwork } from '@/services/ai/geminiVerificationService';
import type { ArtworkReport } from '@/lib/types';

// Anthropic SDK requires Node runtime — not edge.
export const runtime = 'nodejs';

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

export type ReportResponse = {
  success: true;
  insight: ArtworkReport;
};

const VERIFICATION_THRESHOLD = 75;

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

  // Step 1 — Gemini verification (image-only, sequential precondition for Claude).
  // verifyArtwork returns null on missing key, timeout, or any failure → flow
  // degrades gracefully to Claude-only.
  const verification =
    imageBase64 && imageMimeType
      ? await verifyArtwork({ imageBase64, imageMimeType })
      : null;

  // Step 2 — Claude interpretation (with verification context when available).
  const claudeReport = await generateClaudeArtworkReport({
    imageBase64,
    imageMimeType,
    insight: pickInsightHint(data.insight),
    userQuestion,
    outputLanguage,
    verification: verification ?? undefined,
  });

  // Step 3 — Final merge.
  // Verification owns confidence + isVerified + (when high-confidence) artist/title.
  // Claude owns interpretation/artistContext/year/medium.
  const finalInsight: ArtworkReport = { ...claudeReport };
  if (verification) {
    finalInsight.confidence = verification.confidence;
    finalInsight.isVerified = verification.confidence >= VERIFICATION_THRESHOLD;

    if (verification.confidence >= VERIFICATION_THRESHOLD) {
      if (verification.artist) finalInsight.artist = verification.artist;
      if (verification.title) finalInsight.title = verification.title;
    }
  }

  return NextResponse.json<ReportResponse>({
    success: true,
    insight: finalInsight,
  });
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 },
  );
}
