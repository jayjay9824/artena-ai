/**
 * Server-only Gemini verification service.
 * IMPORTANT: import this from route handlers / server components only.
 * Importing from a "use client" component will leak GEMINI_API_KEY into the bundle.
 *
 * Role: identification-only. Gemini extracts visible facts (signature, label, title)
 *       and an honest confidence score. It does NOT produce interpretation.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Verification, RecognitionStatus } from '@/lib/types';

const DEFAULT_MODEL = 'gemini-2.0-flash';
const REQUEST_TIMEOUT_MS = 8_000;

export type VerifyParams = {
  imageBase64: string;
  imageMimeType: string;
};

const SYSTEM_PROMPT = `You are AXVELA verification — an artwork identification engine.

Your single job: extract verifiable information from the provided image.
You do NOT interpret, comment, or describe the meaning of the work.

Look for:
- Visible artist name (signature, label, plate, frame text)
- Visible title (label, plate, frame text)
- Any other label text (OCR)

Output ONLY this JSON object. No code fences, no prose, no markdown.

{
  "artist": "exact name if visible, otherwise null",
  "title": "exact title if visible, otherwise null",
  "labelText": "verbatim label text if any, otherwise empty string",
  "confidence": 0
}

Confidence rubric (be honest — this drives downstream behavior):
- 90-100: signature AND label both clearly visible and readable
- 75-89: clear identifying evidence (signature OR label) clearly readable
- 50-74: partial cues — plausible but uncertain identification
- 25-49: weak signals, inference more than evidence
- 0-24: no identifying evidence visible

Never invent. Never guess. If you cannot read it, return null/empty and a low confidence.`;

export async function verifyArtwork(
  params: VerifyParams,
): Promise<Verification | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Soft fallback — caller continues with Claude-only flow.
    return null;
  }

  const modelName = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  try {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const generation = model.generateContent([
      {
        inlineData: {
          data: params.imageBase64,
          mimeType: params.imageMimeType,
        },
      },
      'Identify the artwork.',
    ]);

    // SDK does not accept AbortSignal directly; use Promise.race for hard cap.
    const result = await Promise.race([
      generation,
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('gemini timeout')),
          REQUEST_TIMEOUT_MS,
        ),
      ),
    ]);

    const text = result.response.text();
    const parsed = safeParseJSON(text);
    return coerceVerification(parsed);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'unknown';
    console.warn('[geminiVerificationService] error:', msg);
    return null;
  }
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

function coerceVerification(raw: unknown): Verification | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const confidence =
    typeof r.confidence === 'number' && Number.isFinite(r.confidence)
      ? Math.max(0, Math.min(100, Math.round(r.confidence)))
      : 0;

  const artist =
    typeof r.artist === 'string' && r.artist.trim().length > 0
      ? r.artist.trim()
      : null;

  const title =
    typeof r.title === 'string' && r.title.trim().length > 0
      ? r.title.trim()
      : null;

  const labelText =
    typeof r.labelText === 'string' ? r.labelText.trim() : '';

  // Recognition status — derived strictly from confidence + presence of
  // identifying signals. The decision is owned by Gemini (the recognizer);
  // the route layer reads it back without re-deriving.
  const status: RecognitionStatus =
    confidence >= 75 && (artist || title)
      ? 'FOUND'
      : confidence >= 40 || labelText.length > 0
        ? 'PARTIAL'
        : 'NOT_FOUND';

  return {
    artist,
    title,
    labelText,
    confidence,
    status,
    source: 'gemini',
  };
}
