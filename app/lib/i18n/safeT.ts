/**
 * safeT — library-agnostic translation helper that guarantees a UI
 * never renders a raw i18n key.
 *
 * The wrapped t() can fail in three ways:
 *
 *   1. throws (some libraries throw on a missing key)
 *   2. returns an empty / falsy string
 *   3. returns the key itself unchanged ("home.headline" → "home.headline")
 *
 * In any of those cases safeT returns the supplied fallback. In dev
 * the first miss for a given key is logged once via console.warn so
 * the gap is visible during development without spamming refreshes.
 *
 * The helper does not import any specific i18n library. The caller
 * passes in their own t() — react-i18next, next-intl, or our in-house
 * useLanguage all expose a compatible (key, vars) → string surface.
 */

const reportedMissing = new Set<string>();

export type TranslationFn = (
  key:   string,
  vars?: Record<string, unknown>,
) => string;

export function safeT(
  t:        TranslationFn,
  key:      string,
  fallback: string,
  vars?:    Record<string, unknown>,
): string {
  try {
    const result = t(key, vars);

    // Library returned nothing useful, or echoed the key back verbatim
    // (a common signal for "key not found" across i18n stacks). Treat
    // both as a miss so the fallback path runs.
    if (!result || result === key) {
      throw new Error("missing");
    }

    return result;
  } catch {
    if (
      process.env.NODE_ENV !== "production" &&
      !reportedMissing.has(key)
    ) {
      reportedMissing.add(key);
      // eslint-disable-next-line no-console
      console.warn(`[i18n] Missing key: "${key}" → fallback: "${fallback}"`);
    }

    return fallback;
  }
}
