/**
 * Server-only Gemini OCR service.
 * IMPORTANT: import this from route handlers / server components only.
 * Importing from a "use client" component will leak GEMINI_API_KEY.
 *
 * Role: OCR + QR + label-text extraction ONLY.
 *       Gemini is NOT the artwork visual-recognition engine. Visual
 *       identification is owned by claudeReportService. Even if Gemini
 *       could recognize the artwork by style, this service must NOT
 *       fill artist/title from style — only from text physically
 *       visible in the image (label, plaque, signature).
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Verification } from '@/lib/types';
import { parseLabelText } from '@/lib/labelParser';

const DEFAULT_MODEL = 'gemini-2.0-flash';
const REQUEST_TIMEOUT_MS = 8_000;

export type VerifyParams = {
  imageBase64: string;
  imageMimeType: string;
};

const SYSTEM_PROMPT = `You are AXVELA OCR — an artwork-label text and QR extraction engine.

ROLE — narrow and strict.
You only extract VISIBLE TEXT and CODES from the image. You DO NOT identify artworks by visual style. You DO NOT use art-history knowledge to fill in artist or title.

Extract:
1. labelText — verbatim transcription of ALL visible text on any wall label, plaque, printed sign, or signature on or beside the artwork. Korean and English mixed is fine. Empty string if no label is visible.
2. qrPayload — if a QR code is visible AND its payload is decodable, return that payload string. Otherwise null. Do not invent.
3. textArtist — if labelText explicitly names an artist, extract verbatim. Otherwise null.
4. textTitle — if labelText explicitly names a title, extract verbatim. Otherwise null.
5. textConfidence — 0–100 integer. How clearly the label text is readable. 0 if no label is visible.

CRITICAL constraints:
- Even if you VISUALLY recognize the artwork, do NOT fill textArtist unless the artist's name is literally written on a visible label or signature on/beside the work.
- Set absent fields to JSON null, not empty strings or "Unknown".
- Keep labelText as "" (empty string) when there is no visible label.
- Do not output any commentary about the artwork itself.

Output ONLY this JSON object. No code fences. No prose. No markdown.

{
  "labelText": "",
  "qrPayload": null,
  "textArtist": null,
  "textTitle": null,
  "textConfidence": 0
}`;

export async function verifyArtwork(
  params: VerifyParams,
): Promise<Verification | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const modelName = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  try {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const generation = model.generateContent([
      {
        inlineData: {
          data: params.imageBase64,
          mimeType: params.imageMimeType,
        },
      },
      'Extract label text and QR codes only. Do not identify the artwork.',
    ]);

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

  const labelText = typeof r.labelText === 'string' ? r.labelText.trim() : '';
  const qrPayload =
    typeof r.qrPayload === 'string' && r.qrPayload.trim()
      ? r.qrPayload.trim()
      : null;
  let textArtist =
    typeof r.textArtist === 'string' && r.textArtist.trim()
      ? r.textArtist.trim()
      : null;
  let textTitle =
    typeof r.textTitle === 'string' && r.textTitle.trim()
      ? r.textTitle.trim()
      : null;
  let textConfidence =
    typeof r.textConfidence === 'number' && Number.isFinite(r.textConfidence)
      ? Math.max(0, Math.min(100, Math.round(r.textConfidence)))
      : 0;

  // Deterministic backup: if Gemini returned labelText but didn't structure
  // artist/title, run our own parser on the OCR'd text.
  if (labelText && !textArtist) {
    const parsed = parseLabelText(labelText);
    if (parsed.artist) {
      textArtist = parsed.artist;
      textConfidence = Math.min(95, textConfidence + parsed.confidenceBoost);
    }
    if (parsed.title && !textTitle) {
      textTitle = parsed.title;
    }
  }

  return {
    labelText,
    qrPayload,
    textArtist,
    textTitle,
    textConfidence,
    source: 'gemini',
  };
}
