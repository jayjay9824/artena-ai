import { NextResponse } from 'next/server';
import { generateClaudeArtworkReport } from '@/services/ai/claudeReportService';
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

  const insight = await generateClaudeArtworkReport({
    imageBase64: pickStringField(data.imageBase64),
    imageMimeType: pickStringField(data.imageMimeType),
    insight: pickInsightHint(data.insight),
    userQuestion: pickStringField(data.userQuestion),
    outputLanguage: isLanguage(data.outputLanguage) ? data.outputLanguage : 'ko',
  });

  // Service always returns a valid report. Never propagate raw errors.
  return NextResponse.json<ReportResponse>({ success: true, insight });
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 },
  );
}
