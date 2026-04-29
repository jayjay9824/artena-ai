/**
 * PART 6 — AXVELA Design System tokens.
 *
 * Single source of truth for colors, spacing, typography, animation
 * timing, and corner radii. New components import from here; legacy
 * surfaces continue to use inline values until they're touched (per
 * the "do not redesign unrelated screens" rule).
 *
 * Premium Apple-level minimal UI guardrails:
 *   • whitespace > decoration
 *   • subtle blur > heavy shadow
 *   • tabular numbers for any % / count read
 *   • spring / cubic ease only — no harsh cuts
 */

/* ── Colors ────────────────────────────────────────────────────── */

export const COLORS = {
  /** Surface — full canvas background. */
  background:    "#FFFFFF",
  /** Primary text + the black Scan button. */
  text:          "#000000",
  /** Same role as text but with a 1pt warmth so it sits cleanly on
   *  layered greys. Use for the dominant CTA. */
  primary:       "#0D0D0D",
  /** iOS Apple-tier secondary label color. */
  textSecondary: "#8E8E93",
  /** Inactive icons / muted side items in the bottom nav. */
  inactive:      "#BBBBBB",
  /** Subtle divider / 0.5px lines. */
  divider:       "#EBEBEB",
  /** Warm bronze accent — kept across surfaces (taste/labels/share). */
  bronze:        "#8A6A3F",
  /** Light bronze for filled saved / detected accents. */
  bronzeLight:   "#C9A56C",
  /** Warm tinted surface — saved-count box, taste-cluster card. */
  surface:       "#FAFAF7",
  /** Used inside camera UI where the scene is dark. */
  cameraInk:     "#0D0D0D",
} as const;

/* ── Spacing — strict 8px grid ─────────────────────────────────── */

export const SPACING = {
  xs:  8,
  sm:  16,
  md:  24,
  lg:  32,
  xl:  48,
  xxl: 64,
} as const;

/* ── Corner radii ──────────────────────────────────────────────── */

export const RADIUS = {
  sm:   8,
  md:   12,
  lg:   16,
  /** Camera focus frame, share-card art block. */
  card: 14,
  pill: 999,
} as const;

/* ── Typography ────────────────────────────────────────────────── */

/**
 * Korean-first chains with iOS / Inter / Roboto fallbacks. The Kakao
 * faces ship clean Hangul; -apple-system resolves to SF Pro on iOS;
 * Inter is loaded via next/font in layout.tsx; Roboto picks up on
 * Android default browsers.
 */
export const FONTS = {
  body:    "'KakaoSmallSans', -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', 'Roboto', system-ui, sans-serif",
  heading: "'KakaoBigSans',   -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', 'Roboto', system-ui, sans-serif",
  mono:    "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  serif:   "Georgia, 'Times New Roman', serif",
} as const;

export const FONT_SIZE = {
  micro:  9,    // brand prefix lines, eyebrow labels
  caption: 11,  // secondary metadata
  small:  12,   // body small / nav
  body:   13,   // standard body
  bodyLg: 14,   // emphasized body
  title:  18,   // section / quick-view insight
  hero:   22,   // page H1
  display: 28,  // brand / key counts
} as const;

/* ── Motion ────────────────────────────────────────────────────── */

/**
 * Timing rules: never harsh cuts, never default browser easing.
 * cubic = generic Apple-tier ease.
 * spring = the spec's default for layout morphs (PART 3).
 * fastSpring = chip-style snaps.
 */
export const ANIM = {
  cubic:      [0.32, 0.72, 0, 1] as [number, number, number, number],
  cubicLock:  [0.22, 1, 0.36, 1] as [number, number, number, number],
  spring:     { type: "spring" as const, stiffness: 200, damping: 20 },
  fastSpring: { type: "spring" as const, stiffness: 380, damping: 32 },
  duration: {
    quick:    150,
    standard: 280,
    smooth:   420,
    long:     520,
  },
} as const;

/* ── Z-index lanes — keep layered overlays predictable ─────────── */

export const Z = {
  base:        0,
  preview:     5,    // frozen-frame overlay above live video
  detection:   25,   // bounding boxes / focus frame
  flashOverlay: 26,  // box-area capture flash
  topBar:      30,   // scanner top bar gradient
  fab:         100,  // bottom nav
  modal:       200,  // permission prompt / scanner screen
  transition:  250,  // analyzing → quick view
  sheet:       360,  // bottom action sheet
  toast:       400,  // offline / link copied
} as const;

export type DesignTokens = {
  colors:    typeof COLORS;
  spacing:   typeof SPACING;
  radius:    typeof RADIUS;
  fonts:     typeof FONTS;
  fontSize:  typeof FONT_SIZE;
  anim:      typeof ANIM;
  z:         typeof Z;
};

export const TOKENS: DesignTokens = {
  colors:   COLORS,
  spacing:  SPACING,
  radius:   RADIUS,
  fonts:    FONTS,
  fontSize: FONT_SIZE,
  anim:     ANIM,
  z:        Z,
};
