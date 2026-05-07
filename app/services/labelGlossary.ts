/**
 * STEP 4 — Protected art-vocabulary glossary.
 *
 * Each entry lists the surface forms a single concept can take across
 * the languages we accept. The translator is told to preserve any of
 * these — never break "Impressionism" into 印象派 → "stamping faction"
 * because a literal translator didn't know it was a movement, never
 * render Trompe-l'œil as "deceive eye".
 *
 * Adding entries is cheap. Renaming `canonical` is breaking — the
 * field is the surface key the prompt directive emits.
 */

export type GlossaryLang = "en" | "ko" | "ja" | "zh" | "fr" | "es" | "de" | "it";

export interface GlossaryEntry {
  /** Canonical English form — the lookup key emitted to prompts. */
  canonical: string;
  /** Surface forms by language. Loanwords stay verbatim across rows. */
  forms: Partial<Record<GlossaryLang, string[]>>;
}

export const ART_GLOSSARY: GlossaryEntry[] = [
  {
    canonical: "Impressionism",
    forms: {
      en: ["Impressionism", "Impressionist"],
      ko: ["인상주의", "인상파"],
      ja: ["印象派", "印象主義"],
      zh: ["印象派", "印象主义"],
      fr: ["Impressionnisme", "Impressionniste"],
    },
  },
  {
    canonical: "Gouache",
    forms: {
      en: ["Gouache"],
      ko: ["구아슈"],
      ja: ["グワッシュ", "ガッシュ"],
      fr: ["Gouache"],
    },
  },
  {
    canonical: "Trompe-l'œil",
    forms: {
      en: ["Trompe-l'oeil", "Trompe l'oeil", "Trompe-l'œil"],
      ko: ["트롱프뢰유"],
      fr: ["Trompe-l'œil"],
    },
  },
  {
    canonical: "Chiaroscuro",
    forms: {
      en: ["Chiaroscuro"],
      ko: ["키아로스쿠로", "명암법"],
      it: ["Chiaroscuro"],
    },
  },
  {
    canonical: "Sfumato",
    forms: {
      en: ["Sfumato"],
      ko: ["스푸마토"],
      it: ["Sfumato"],
    },
  },
  {
    canonical: "Pointillism",
    forms: {
      en: ["Pointillism", "Pointillist"],
      ko: ["점묘법", "점묘파"],
      fr: ["Pointillisme"],
    },
  },
  {
    canonical: "Cubism",
    forms: {
      en: ["Cubism", "Cubist"],
      ko: ["입체주의", "큐비즘"],
      ja: ["キュビスム"],
      fr: ["Cubisme"],
    },
  },
  {
    canonical: "Bauhaus",
    forms: {
      en: ["Bauhaus"],
      ko: ["바우하우스"],
      de: ["Bauhaus"],
    },
  },
  {
    canonical: "Dansaekhwa",
    forms: {
      en: ["Dansaekhwa"],
      ko: ["단색화"],
    },
  },
  {
    canonical: "Mono-ha",
    forms: {
      en: ["Mono-ha"],
      ko: ["모노하"],
      ja: ["もの派"],
    },
  },
  {
    canonical: "Suiboku-ga",
    forms: {
      en: ["Suiboku-ga", "Suibokuga"],
      ko: ["수묵화"],
      ja: ["水墨画"],
    },
  },
];

/**
 * Pull the glossary entries that actually appear in `text` (case-
 * insensitive substring match across all known surface forms). Lets
 * the translator prompt scope the "preserve these" directive to
 * terms the user will actually see, instead of dumping the full list.
 */
export function findGlossaryHits(text: string): GlossaryEntry[] {
  const lower = text.toLowerCase();
  const hits: GlossaryEntry[] = [];
  for (const entry of ART_GLOSSARY) {
    for (const langForms of Object.values(entry.forms)) {
      if (!langForms) continue;
      if (langForms.some(form => lower.includes(form.toLowerCase()))) {
        hits.push(entry);
        break;
      }
    }
  }
  return hits;
}
