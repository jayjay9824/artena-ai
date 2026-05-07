/**
 * AXVELA AI — central brand constants.
 *
 * Single source of truth for the visible brand strings. UI surfaces
 * should read from BRAND rather than hardcoding "AXVELA AI" /
 * "AXVELA Scanner" / etc, so future brand tweaks (taglines, casing,
 * domain) ripple from one place.
 *
 * Frontend-only. Persistent identifiers (localStorage keys, API
 * routes, JSON payload keys) intentionally remain on the legacy
 * "artena_*" naming for backward compatibility with stored data —
 * see step_3 backward_compatibility rules.
 */

export const BRAND = {
  name:        "AXVELA AI",
  shortName:   "AXVELA",
  scannerName: "AXVELA Scanner",
  domain:      "axvela.ai",
} as const;

export type Brand = typeof BRAND;
