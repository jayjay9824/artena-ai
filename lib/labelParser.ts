/**
 * Label parser — extracts artist / title / year from OCR'd museum &
 * gallery labels. Pure, deterministic, no AI.
 *
 * Design principle: when a label exists, it's far more reliable than
 * any visual style guess. The parser is conservative — only emits a
 * field when the line shape is plausibly that field. Failed extractions
 * leave fields undefined; nothing is invented.
 *
 * Confidence boost:
 *   +20 when labelText is non-empty (we have OCR'd text)
 *   +20 when an artist line is identified
 *   +5  when a title line is identified
 *   +5  when a year is found
 *   (cap applied at the call site, not here)
 */

export type ParsedLabel = {
  artist?: string;
  title?: string;
  year?: string;
  /** 0–50 typical range; caller clamps with overall confidence ceiling. */
  confidenceBoost: number;
};

/* ─── Patterns ─── */

const YEAR_RANGE = /\b(1[7-9]|20)\d{2}\s*[‐-―−\-~]\s*(1[7-9]|20)\d{2}\b/;
const SINGLE_YEAR = /\b(1[7-9]|20)\d{2}\b/;
const STANDALONE_YEAR_LINE = /^\(?\s*(1[7-9]|20)\d{2}(?:\s*[‐-―−\-~]\s*(1[7-9]|20)\d{2})?\s*\)?$/;

const MEDIUM_HINTS = /(캔버스|유채|아크릴|종이|혼합|판화|조각|사진|드로잉|수채|먹|동판|석판|oil\b|acrylic|canvas|paper|mixed\smedia|print|sculpture|photograph|drawing|watercolor|pencil|charcoal|gouache|tempera|ink\son)/i;

const ACCESSION_LIKE = /^[A-Z]{1,5}[-\s.]?\d{2,}\b/;
const COPYRIGHT_OR_INSTITUTION = /(museum|gallery|reserved|©|copyright|미술관|갤러리|박물관|소장|콜렉션|collection of)/i;
const PARENS_TAIL = /\s*\([^)]*\)\s*$/;
const PARENS_LEADING_YEARS_NATIONALITY = /\s*\((?:[^()]*\b(?:1[7-9]|20)\d{2}\b[^()]*|american|korean|french|german|japanese|chinese|english|british|italian|spanish|swiss|dutch|austrian)[^()]*\)/i;

/* ─── Helpers ─── */

function isYearLine(line: string): boolean {
  return STANDALONE_YEAR_LINE.test(line.trim());
}

function isMediumLine(line: string): boolean {
  // Medium-only line is usually short and contains a medium keyword.
  return MEDIUM_HINTS.test(line) && line.length < 50;
}

function isJunkLine(line: string): boolean {
  return (
    !line ||
    line.length < 2 ||
    ACCESSION_LIKE.test(line) ||
    COPYRIGHT_OR_INSTITUTION.test(line)
  );
}

function looksLikeArtistName(line: string): boolean {
  if (isJunkLine(line) || isYearLine(line) || isMediumLine(line)) return false;

  // 1–6 visible tokens; reject sentences (anything with '.', '!', '?').
  if (/[.!?]/.test(line)) return false;

  const tokens = line.split(/[\s·,]+/).filter(Boolean);
  if (tokens.length < 1 || tokens.length > 6) return false;

  // Reject very long lines (titles > 40 chars typically aren't artist names)
  if (line.length > 60) return false;

  return true;
}

/* ─── Public entry ─── */

export function parseLabelText(labelText: string | null | undefined): ParsedLabel {
  const text = labelText?.trim() ?? '';
  if (!text) return { confidenceBoost: 0 };

  const lines = text
    .split(/[\n\r]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  let artist: string | undefined;
  let title: string | undefined;
  let year: string | undefined;

  // Year — prefer a standalone year line; fall back to any year token
  // anywhere in the text. Year ranges (e.g. lifespan in parens) are
  // captured but the artwork year preference is the standalone form.
  for (const line of lines) {
    if (isYearLine(line)) {
      year = line.replace(/[()]/g, '').trim();
      break;
    }
  }
  if (!year) {
    const m = text.match(SINGLE_YEAR);
    if (m) year = m[0];
  }
  if (!year) {
    const r = text.match(YEAR_RANGE);
    if (r) year = r[0];
  }

  // Artist — first line that matches the name shape.
  // Strip trailing parens (lifespan / nationality) before testing.
  let artistLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const stripped = raw
      .replace(PARENS_LEADING_YEARS_NATIONALITY, '')
      .replace(PARENS_TAIL, '')
      .trim();
    if (looksLikeArtistName(stripped)) {
      artist = stripped;
      artistLineIdx = i;
      break;
    }
  }

  // Title — first non-year/non-medium/non-junk line after the artist line.
  if (artistLineIdx >= 0) {
    for (let i = artistLineIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      if (isYearLine(line)) continue;
      if (isMediumLine(line)) continue;
      if (isJunkLine(line)) continue;
      // Strip trailing year-in-parens ("Title (1970)" → "Title")
      const cleaned = line.replace(/\s*\(\s*\d{4}.*?\)\s*$/, '').trim();
      title = cleaned || line;
      break;
    }
  }

  // Confidence boost — additive, caller clamps with overall ceiling.
  let boost = 0;
  if (text.length > 0) boost += 20;
  if (artist) boost += 20;
  if (title) boost += 5;
  if (year) boost += 5;

  return { artist, title, year, confidenceBoost: boost };
}
