/**
 * AXVELA AI — central brand constants (UI-facing only).
 *
 * Single source of truth for the visible brand strings: name,
 * pronunciation guides, tagline, and the full descriptor in both
 * languages. UI surfaces should read from BRAND rather than
 * hardcoding "AXVELA AI" / "엑스벨라" / "Cultural Intelligence" /
 * etc., so future brand tweaks ripple from one place.
 *
 * Scope rule: this file is for UI-facing strings ONLY. Internal
 * persistent identifiers (localStorage keys, API routes, JSON
 * payload keys, etc.) on the legacy `artena_*` naming are
 * intentionally left untouched for backward compatibility with
 * stored data and existing API contracts. Do NOT use this constant
 * to rename those identifiers.
 */

export const BRAND = {
  name:    "AXVELA",
  product: "AXVELA AI",

  /**
   * Pronunciation guides for the brand name. Surfaced near the
   * logo on first-paint experiences and used by screen-reader
   * affordances where appropriate.
   */
  pronunciation: {
    ko:  "엑스벨라",
    ipa: "ɛks.ˈvɛ.lə",
    ja:  "エクスベラ",
  },

  /**
   * Short tagline used as the all-caps eyebrow line above the
   * product name (e.g. "CULTURAL INTELLIGENCE / AXVELA AI").
   */
  tagline: {
    en: "CULTURAL INTELLIGENCE",
    ko: "컬처럴 인텔리전스",
  },

  /**
   * Full descriptor for places that need the longer brand line —
   * marketing surfaces, OG metadata, footer copy, etc.
   */
  fullDescriptor: {
    en: "AI for Cultural Intelligence",
    ko: "컬처럴 인텔리전스 AI",
  },
} as const;

export type Brand = typeof BRAND;
