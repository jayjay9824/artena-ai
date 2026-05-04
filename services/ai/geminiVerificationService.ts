/**
 * Server-only Gemini verification service.
 * IMPORTANT: import this from route handlers / server components only.
 * Importing from a "use client" component will leak GEMINI_API_KEY into the bundle.
 *
 * Role: identification-only. Gemini extracts visible facts (signature, label, title)
 *       and an honest confidence score. It does NOT produce interpretation.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  Verification,
  RecognitionStatus,
  ArtworkCandidate,
} from '@/lib/types';
import { parseLabelText } from '@/lib/labelParser';

const DEFAULT_MODEL = 'gemini-2.0-flash';
const REQUEST_TIMEOUT_MS = 8_000;

export type VerifyParams = {
  imageBase64: string;
  imageMimeType: string;
  /** Top-K image-similarity candidates from the vector layer. Optional. */
  candidates?: ArtworkCandidate[];
};

const SYSTEM_PROMPT = `You are AXVELA verification — an artwork identification engine.

Your job: extract verifiable text and identifying information from the image. You do NOT interpret, comment, or describe meaning.

PRIORITY ORDER (always follow):
1. Wall label, plaque, or printed text near the artwork — TRANSCRIBE every visible word into labelText, verbatim.
2. Plaque or printed text on the artwork itself.
3. Signature on the work.
4. Visual recognition by style — LAST resort, only when no text is visible.

When ANY label or text is visible:
- Transcribe the ENTIRE label into labelText, including partially-readable parts and Korean/English mixes.
- Extract the artist and title from the transcription if you can read them.
- Set confidence HIGH (≥80) when the label is clear and complete.
- Set confidence MEDIUM (50–79) when the label is partial or some text is illegible.

When NO label or text is visible:
- Do NOT invent an artist name. Set artist=null.
- Set confidence based on style cues alone — typically below 50.
- labelText should be empty string.

Output ONLY this JSON object. No code fences, no prose, no markdown.

{
  "artist": "exact name from label/signature, or null if not visible",
  "title": "exact title from label, or null if not visible",
  "labelText": "verbatim transcription of ALL visible text on label/plaque, or empty string",
  "confidence": 0
}

Confidence rubric:
- 90–100: full label transcribed AND artist+title clearly readable
- 80–89: label visible AND artist OR title clearly readable
- 60–79: partial label — some text legible
- 40–59: weak signals (small/blurry text, partial signature)
- 0–39: no identifying text visible

Never invent. Never guess. If you cannot read it, return null/empty with a low confidence.`;

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

    // When upstream image-similarity returned candidates, present them
    // to Gemini as hypotheses — Gemini's job is to verify or reject.
    let prompt = 'Identify the artwork.';
    if (params.candidates && params.candidates.length > 0) {
      const lines = [
        'Image-similarity candidates from upstream vector search:',
        ...params.candidates.slice(0, 5).map(
          (c, i) =>
            `  ${i + 1}. ${c.artist} — ${c.title}${c.year ? ` (${c.year})` : ''} [similarity ${c.similarity.toFixed(2)}]`,
        ),
        '',
        'If the image visibly matches one of these candidates, return that artist/title verbatim and set confidence accordingly. If none match, return your own reading or null. Do NOT invent.',
      ];
      prompt = lines.join('\n');
    }

    const generation = model.generateContent([
      {
        inlineData: {
          data: params.imageBase64,
          mimeType: params.imageMimeType,
        },
      },
      prompt,
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

  const baseConfidence =
    typeof r.confidence === 'number' && Number.isFinite(r.confidence)
      ? Math.max(0, Math.min(100, Math.round(r.confidence)))
      : 0;

  const geminiArtist =
    typeof r.artist === 'string' && r.artist.trim().length > 0
      ? r.artist.trim()
      : null;

  const geminiTitle =
    typeof r.title === 'string' && r.title.trim().length > 0
      ? r.title.trim()
      : null;

  const labelText =
    typeof r.labelText === 'string' ? r.labelText.trim() : '';

  // Label-first overlay: when labelText is present, run the deterministic
  // parser on it. If the parser extracts an artist, it takes priority over
  // Gemini's own artist field (the parser reads the OCR'd text directly,
  // bypassing any visual-recognition guess Gemini may have layered on top).
  const parsed = parseLabelText(labelText);

  let finalArtist = geminiArtist;
  let finalTitle = geminiTitle;
  let derivedFromLabel = false;
  let confidence = baseConfidence;

  if (labelText.length > 0) {
    if (parsed.artist) {
      finalArtist = parsed.artist;
      derivedFromLabel = true;
      if (!finalTitle && parsed.title) finalTitle = parsed.title;
      confidence = Math.min(95, confidence + parsed.confidenceBoost);
    } else if (parsed.title && !finalTitle) {
      finalTitle = parsed.title;
      confidence = Math.min(95, confidence + parsed.confidenceBoost);
    } else {
      // labelText exists but parser couldn't structure it — still a signal.
      confidence = Math.min(95, confidence + 10);
    }
  }

  // Recognition status. Label-derived artist forces FOUND with a 75 floor:
  // OCR'd text is more trustworthy than visual confidence alone.
  let status: RecognitionStatus;
  if (derivedFromLabel && finalArtist) {
    status = 'FOUND';
    if (confidence < 75) confidence = 75;
  } else if (confidence >= 75 && (finalArtist || finalTitle)) {
    status = 'FOUND';
  } else if (confidence >= 40 || labelText.length > 0) {
    status = 'PARTIAL';
  } else {
    status = 'NOT_FOUND';
  }

  return {
    artist: finalArtist,
    title: finalTitle,
    labelText,
    confidence,
    status,
    source: 'gemini',
    derivedFromLabel,
  };
}
